'use strict';
require('console.table');
var selenium = require('selenium-standalone');
var webdriverio = require('webdriverio');
var path = require('path');
var $ = require('async');
var fs = require('fs');
var exec = require('child_process').execSync;
var submitAndCompare = require('../../submit');
var captureAndCrop = require('../../capture');
var appConfig;
var browserCrop = {
    chrome: true
};

module.exports = function (config, options) {
    appConfig = config;
    console.log(`Starting / Installing Selenium Version: ${options.seleniumVersion}. Verbose Logging: ${options.verbose}`);
    selenium.install(
        {
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
                throw err;
            }

            startAndRunTests(config, options, (err, results) => {
                submitAndCompare(config.scholarUrl, results, handleImageComparison);
            });
        });
};

function startAndRunTests(config, options, callback) {
    console.log(`Inside Start And Run Tests`);
    selenium.start({
        version: options.seleniumVersion
    }, function (err, childProcess) {

        if (options.verbose) {
            childProcess.stderr
                .pipe(process.stdout);
        }

        if (err) {
            console.error(`Selenium start Error! ${err}`);
            throw err;
        }

        process.on('uncaughtException', (err) => {
            console.error(`Caught exception: ${JSON.stringify(err)}`);

            if (childProcess) {
                console.log('Killing selenium process!');
                childProcess.kill();
            }
        });

        runTests(config, options, function (err, results) {
            console.log('Finished Tests, killing selenium process.');
            childProcess.kill();
            callback(err, results);
        });
    });
}

function runTests(config, options, completionCallback) {

    var client = webdriverio.remote({
        "logLevel": options.verbose ? "verbose" : "silent",
        "desiredCapabilities": {
            browserName: options.browser
        },
        "phantomjs.binary.path": 'node_modules/.bin/phantomjs'
    }).init();

    client.addCommand('loadCookies', function (cookies) {
        var self = this;
        return cookies.reduce(function (promiseChain, currentCookie) {
            return self.setCookie(currentCookie)
        }, cookies[0]);
    });

    var globalCookies = config.cookies || [];
    var scenarioFns = options.scenarios.map(scenario => generateScenarioThunk.bind(null, client, scenario));

    function generateScenarioThunk(client, scenario, callback) {
        'use strict';
        console.log('====================================');
        console.log(`Running: ${scenario.name}`);
        console.log('====================================');
        try {
            const cookies = globalCookies.concat(scenario.cookies || []);
            const uri = (scenario.url || config.baseUrl) + scenario.path;
            const selector = scenario.selector || 'body';
            const setupFunction = scenario.setup || function () {
                };
            const viewportSize = scenario.viewportSize || {width: 1280, height: 900};
            let elementBox;

            client
                .url(uri)
                .deleteCookie()
                .loadCookies(cookies)
                .pause(500)
                .url(uri)
                .setViewportSize(viewportSize)
                .pause(scenario.loadTimeout || 2000)
                .execute(setupFunction)
                .pause(scenario.setupTimeout || 0)
                .execute(function (selector) {
                    return document.querySelector(selector).getBoundingClientRect();
                }, selector)
                .then(boundingClientRect => {
                    if (options.verbose) console.log(`${scenario.name} bounding rectangle: ${JSON.stringify(boundingClientRect.value)}`);
                    elementBox = boundingClientRect.value;
                })
                .getViewportSize()
                .then(function (size) {
                    'use strict';
                    let cropRectangle = {
                        left: elementBox.left,
                        top: elementBox.top,
                        width: browserCrop[options.browser] ? Math.min(elementBox.width, size.width) : elementBox.width,
                        height: browserCrop[options.browser] ? Math.min(elementBox.height, size.height) : elementBox.height
                    };
                    return client
                        .saveScreenshot()
                        .then((imageData) => {
                            captureAndCrop(scenario.name, imageData, cropRectangle, options, callback);
                        })
                        .catch(err => {
                            errorHandler(scenario.name, err, callback)
                        });

                })
                .catch(err => {
                    return errorHandler(scenario.name, err, callback)
                });

        } catch (e) {
            console.log(`${scenario.name} threw an Exception!`, JSON.stringify(e));
            callback(e);
        }

    }

    function errorHandler(scenarioName, err, callback) {
        console.log(`${scenarioName} failed! Error: ${err.message || JSON.stringify(err)}`);
        fs.writeFile(path.join(process.cwd(), options.output, `${options.browser}-${scenarioName}-ERROR.png`), new Buffer(err.screenshot, 'base64'), 'utf8', function () {
            callback({
                type: err.type,
                message: err.message
            });
        });
    }


    $.series(scenarioFns, (err, results) => {
        console.log('Finished Specs! Killing client');
        if (err) {
            console.error('Test Execution Error: ', err);
            throw err;
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
        console.error('Error passed into Image comparison!');
        throw err;
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