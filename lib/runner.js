'use strict';

require('console.table');
const selenium = require('selenium-standalone');
const webdriverio = require('webdriverio');
const path = require('path');
const $ = require('async');
const fs = require('fs');
const submitAndCompare = require('./submit');
const compareLocally = require('./compare');
const captureAndCrop = require('./capture');
const includes = require('lodash.includes');

let appConfig;
const browserCrop = {
    chrome: true,
    edge: true,
    safari: true
};
const fullPageScreenshotBrowsers = ['firefox', 'ie'];

module.exports = function(config, options) {
    appConfig = config;

    if (options.runner === 'remote') {
        setupRemoteSessionAndRunTests(config, options)
    } else {
        setupSeleniumAndRunTests(config, options);
    }
};

function setupSeleniumAndRunTests(config, options) {
    console.log(`Starting / Installing Selenium Version: ${options.seleniumVersion}. Verbose Logging: ${!!options.verbose}`);
    selenium.install({
        version: options.seleniumVersion,
        baseURL: 'https://selenium-release.storage.googleapis.com',
        logger: message => {
            if (options.verbose) {
                console.log(message)
            }
        }
    }, err => {
        if (err) {
            console.error(`Selenium installation Error! ${err}`);
            process.exit(1);
        }

        startSeleniumAndRunTests(config, options, (err, results) => {
            if (options.compareLocally) {
                compareLocally(options.baselineDirectory, results, (err, results) => {
                  handleLocalImageComparison(err, results, options);
                });
            } else {
                submitAndCompare(config.scholarUrl, results, handleImageComparison);
            }
        });
    });
}

function setupRemoteSessionAndRunTests(config, options) {
    console.log('Starting Up Remote Connection.');

    process.on('uncaughtException', (err) => {
        console.error(`Caught exception: ${err.stack || JSON.stringify(err)}`);
        process.exit(1);
    });

    let browserOptions = config.browserstack && config.browserstack[options.browser] || {
            browserName: options.browser,
            platform: "ANY"
        };
    let baseOptions = {
        "logLevel": options.verbose ? "verbose" : "silent",
        "desiredCapabilities": browserOptions,
        "phantomjs.binary.path": 'node_modules/.bin/phantomjs'
    };
    let webdriverConfig = Object.assign(baseOptions, config);
    let client = webdriverio.remote(webdriverConfig).init();

    runTests(client, config, options, (err, results) => {
        if (err) {
            console.error(`Run Tests Error! ${err}`);
            process.exit(1);
        }
        console.log('Finished Tests. Comparing Results.');
        if (options.compareLocally) {
          compareLocally(options.baselineDirectory, results, function(err, results) {
            handleLocalImageComparison(err, results, options);
          });
        } else {
            submitAndCompare(config.scholarUrl, results, handleImageComparison);
        }
    });
}

function startSeleniumAndRunTests(config, options, callback) {
    console.log(`Inside Start And Run Tests`);
    selenium.start({
        version: options.seleniumVersion
    }, (err, childProcess) => {

        if (options.verbose) {
            childProcess.stderr
                .pipe(process.stdout);
        }

        if (err) {
            console.error(`Selenium start Error! ${err}`);
            process.exit(1);
        }

        process.on('uncaughtException', (err) => {
            console.error(`Caught exception: ${err.stack || JSON.stringify(err)}`);

            if (childProcess) {
                console.log('Killing selenium process!');
                childProcess.kill();
            }
            process.exit(1);
        });

        let client = webdriverio.remote({
            "logLevel": options.verbose ? "verbose" : "silent",
            "desiredCapabilities": {
                browserName: options.browser
            },
            "phantomjs.binary.path": 'node_modules/.bin/phantomjs'
        }).init();

        runTests(client, config, options, (err, results) => {
            console.log('Finished Tests, killing selenium process.');
            childProcess.kill();
            callback(err, results);
        });
    });
}

function runTests(client, config, options, completionCallback) {

    function conditionalLog() {
        if (options.verbose) console.log.apply(console, arguments);
    }

    client.addCommand('loadCookies', (cookies) => {
        let self = this;
        return cookies.reduce((promiseChain, currentCookie) => {
            return self.setCookie(currentCookie)
        }, cookies[0]);
    });

    client.addCommand('runCommands', (commandFn) => {
        return commandFn(this);
    });

    let globalCookies = config.cookies || [];
    let scenarioFns = options.scenarios.map(scenario => generateScenarioThunk.bind(null, client, scenario));

    function generateScenarioThunk(client, scenario, scenarioCallback) {
        'use strict';
        console.log('====================================');
        console.log(`Running: ${scenario.name}`);
        console.log('====================================');
        try {
            const cookies = globalCookies.concat(scenario.cookies || []);
            const uri = (scenario.url || config.baseUrl) + scenario.path;
            const selector = scenario.selector || 'body';
            const setupFunction = scenario.setup || function() {};
            const viewportSize = scenario.viewportSize || {
                width: 1280,
                height: 900
            };
            const waitTimeout = scenario.waitTimeout || 3000;
            const scrollOffsetX = config.scrollOffsetX || 0;
            const scrollOffsetY = config.scrollOffsetY || 0;
            let elementBox;

            client
                .url(uri)
                .execute(() => {
                    window.sessionStorage.clear();
                })
                .deleteCookie()
                .loadCookies(cookies)
                .pause(500)
                .setViewportSize(viewportSize)
                .url(uri)
                .pause(scenario.loadTimeout || 2000)
                .runCommands(setupFunction)
                .pause(scenario.setupTimeout || 0)
                .waitForVisible(selector, waitTimeout)
                .then(() => {
                    if (!includes(fullPageScreenshotBrowsers, options.browser)) {
                        return client.scroll(selector, scrollOffsetX, scrollOffsetY).getLocationInView(selector);
                    } else {
                        return client.getLocation(selector);
                    }
                })
                .then(result => {
                    conditionalLog('Element Position', result);
                    elementBox = {
                        top: result.y,
                        left: result.x
                    }
                })
                .getElementSize(selector)
                .then(result => {
                    conditionalLog('Element Size', result);
                    elementBox.width = result.width;
                    elementBox.height = result.height;
                })
                .getViewportSize()
                .then(size => {
                    'use strict';
                    let cropRectangle = {
                        left: elementBox.left,
                        top: elementBox.top,
                        width: Math.min(elementBox.width, size.width),
                        height: Math.min(elementBox.height, size.height)
                    };
                    conditionalLog('Final Crop Rectangle', cropRectangle);
                    return client
                        .saveScreenshot()
                        .then((imageData) => {
                            captureAndCrop(scenario, imageData, cropRectangle, options, scenarioCallback);
                        })
                        .catch(err => {
                            errorHandler(scenario.name, err, scenarioCallback)
                        });
                })
                .catch(err => {
                    return errorHandler(scenario.name, err, scenarioCallback)
                });

        } catch (e) {
            console.log(`${scenario.name} threw an Exception!`, JSON.stringify(e));
            scenarioCallback(e);
        }
    }

    function errorHandler(scenarioName, err, callback) {
        console.log(`${scenarioName} failed! Error: ${err.message || JSON.stringify(err)}`);
        callback({
            type: err.type,
            message: err.message
        });
    }

    $.series(scenarioFns, (err, results) => {
        console.log('Finished Specs! Killing client');
        if (err) {
            console.error('Test Execution Error: ', err);
            process.exit(1);
        }

        client
            .end()
            .then(() => {
                completionCallback(err, results);
            });

    });
}

function handleImageComparison(err, comparisonResults) {
    if (err) {
        console.error(`Error passed to handleImageComparison! ${err}`);
        process.exit(1);
    }
    console.log('Final process complete, images submitted and compared.');
    let errorArray = comparisonResults
        .filter(result => !result.passes)
        .map(result => ({
            Name: result.name,
            "Diff Image": appConfig.scholarUrl + result.diffUrl,
            "Diff Percentage": result.difference + '%',
            "Same Resolution": result.isSameDimensions ? 'Yes' : 'No'
        }));

    if (errorArray.length) {
        console.error(`${errorArray.length} Failure${errorArray.length === 1 ? '' : 's'}`);
        console.table(errorArray);
        process.exit(1)
    } else {
        console.log('No errors!');
        process.exit();
    }
}

function handleLocalImageComparison(err, comparisonResults, options) {
  if (err) {
      console.error(`Error passed to handleImageComparison! ${err}`);
      process.exit(1);
  }
  console.log('Final process complete, images compared.');

  let failedResults = comparisonResults.filter(result => !result.passes);

  if (failedResults.length) {
      console.error(`${failedResults.length} Failure${failedResults.length === 1 ? '' : 's'}`);

      fs.readFile(path.join(__dirname, 'report.template.html'), 'utf8', (err, html) => {
        if (err) {
          console.error('Error reading error report');
          process.exit(1);
        }

        let reportFile = path.join(process.cwd(), options.testReportDirectory, 'report.html');
        let imageHtml = '<div>';
        failedResults.forEach(result => {
          imageHtml += `
            <h2>${result.name}</h2>
            <p>Same Dimensions: ${result.isSameDimensions ? 'Yes' : 'No'}</p>
            <img src="${result.baselineImage}"/>
            <img src="${result.image}"/>
          `;
        });
        imageHtml += '</div>';

        fs.writeFileSync(reportFile, html.replace('${images}', imageHtml));
        console.log(`Created test report at: ${reportFile}`);
        process.exit(1);
      });
  } else {
      console.log('No errors!');
      process.exit();
  }
}
