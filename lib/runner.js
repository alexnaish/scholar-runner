'use strict';

require('console.table');
const selenium = require('selenium-standalone');
const webdriverio = require('webdriverio');
const path = require('path');
const $ = require('async');
const fs = require('fs');
const includes = require('lodash.includes');

const submitAndCompare = require('./submit');
const compareLocally = require('./compare');
const captureAndCrop = require('./capture');
const reporter = require('./reporter');
const createClient = require('../helpers/client');

let appConfig;
const browserCrop = {
    chrome: true,
    edge: true,
    safari: true,
    firefox: true,
    ie: false
};

module.exports = function(config, options) {
    appConfig = config;

    if (options.runner === 'remote') {
        setupRemoteSessionAndRunTests(config, options)
    } else {
        setupSeleniumAndRunTests(config, options);
    }
};

function finaliseResults (err, results, config, options) {
    if (err) {
        console.error(`Run Tests Error! ${err}`);
        process.exit(1);
    }
    console.log('Finished Tests. Comparing Results.');
    if (options.compareLocally) {
        compareLocally(options.baselineDirectory, results, (compareError, results) => {
            reporter.handleImageComparison(compareError, results, options);
        });
    } else {
        submitAndCompare(config.scholarUrl, results, reporter.handleImageComparison);
    }
}

function handleExceptionsThrown(childProcess) {
  process.on('uncaughtException', (err) => {
      console.error(`Caught exception: ${err.stack || JSON.stringify(err)}`);
      if (childProcess) {
          console.log('Killing selenium process!');
          childProcess.kill();
      }
      process.exit(1);
  });
}



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
            finaliseResults(err, results, config, options);
        });
    });
}

function setupRemoteSessionAndRunTests(config, options) {
    console.log('Starting Up Remote Connection.');

    handleExceptionsThrown();
    let client = createClient(config, options);

    runTests(client, config, options, (err, results) => {
        finaliseResults(err, results, config, options);
    });
}

function startSeleniumAndRunTests(config, options, callback) {
    console.log(`Inside Start And Run Tests`);
    selenium.start({
        version: options.seleniumVersion
    }, (err, childProcess) => {
        if (err) {
            console.error(`Selenium start Error! ${err}`);
            process.exit(1);
        }
        if (options.verbose) {
            childProcess.stderr.pipe(process.stdout);
        }
        handleExceptionsThrown(childProcess);
        let client = createClient(config, options);

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

    client.addCommand('loadCookies', function (cookies) {
        let self = this;
        return cookies.reduce((promiseChain, currentCookie) => {
            return self.setCookie(currentCookie)
        }, cookies[0]);
    });

    client.addCommand('runCommands', function (commandFn) {
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
                    if (browserCrop[options.browser]) {
                        return client.scroll(
                          selector,
                          scrollOffsetX,
                          scrollOffsetY
                        ).getLocationInView(selector);
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
