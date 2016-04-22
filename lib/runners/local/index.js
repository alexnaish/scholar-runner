'use strict';
require('console.table');
var selenium = require('selenium-standalone');
var webdriverio = require('webdriverio');
var path = require('path');
var $ = require('async');
var fs = require('fs');
var exec = require('child_process').exec;
var ps = require('ps-node');
var submitAndCompare = require('../../submit');
var captureAndCrop = require('../../capture');

var browserCrop = {
    chrome: true
};

module.exports = function (config, options) {

    console.log(`Starting / Installing Selenium Version: ${options.seleniumVersion}`);
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

            exec('pkill -f selenium', () => {
                startAndRunTests(config, options, (err, results) => {
                    submitAndCompare(config.scholarUrl, results, handleImageComparison);
                });
            });
        }
    );
};

function startAndRunTests(config, options, callback) {
    selenium.start({
        version: options.seleniumVersion
    }, function (err, childProcess) {

        if(options.verbose) {
            childProcess.stderr
                .pipe(process.stdout);
        }

        if (err) {
            console.error(`Selenium start Error! ${err}`);
            throw err;
        }

        process.on('uncaughtException', () => {
            console.log('Killing selenium process!');
            if (childProcess) childProcess.kill();
        });

        runTests(config, options, function (err, results) {
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
    var cookies = config.cookies || [];
    cookies.forEach(cookie => {
        client.setCookie(cookie);
    });

    var scenarioFns = options.scenarios.map(scenario => generateScenarioThunk.bind(null, client, scenario));

    function generateScenarioThunk(client, scenario, callback) {
        'use strict';
        console.log(`Running ${scenario.name}`);

        const uri = (scenario.url || config.baseUrl) + scenario.path;
        const selector = scenario.selector || 'body';
        const setupFunction = scenario.setup || function () {
            };
        const viewportSize = scenario.viewportSize || {width: 1280, height: 900};
        let elementBox;
        client
            .url(uri)
            .setViewportSize(viewportSize)
            .pause(scenario.loadTimeout || 2000)
            .execute(setupFunction)
            .pause(scenario.setupTimeout || 0)
            .waitForVisible(selector)
            .execute(function (selector) {
                return document.querySelector(selector).getBoundingClientRect();
            }, selector)
            .then(boundingClientRect => {
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
                    });
            })
            .catch(errorHandler.bind(null, callback, scenario.name));

    }

    function errorHandler(callback, scenarioName, err) {
        fs.writeFile(path.join(process.cwd(), `test_out/images/${options.browser}-${scenarioName}-ERROR.png`), new Buffer(err.screenshot, 'base64'), 'utf8', function () {
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
    console.log('Final process complete, images submitted and compared.');

    let errorArray = comparisonResults
        .filter(result => !result.passes)
        .map(result => ({
            Name: result.name,
            "Diff Image": config.scholarUrl + result.diffUrl,
            "Diff Percentage": result.difference + '%',
            "Same Resolution": result.isSameDimensions ? 'Yes' : 'No'
        }));

    if (errorArray.length) {
        console.error(`${errorArray.length} Failures`);
        console.table(errorArray);
        process.exit(1)
    } else {
        process.exit();
    }
}