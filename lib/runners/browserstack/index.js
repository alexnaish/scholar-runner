'use strict';

require('console.table');
var webdriverio = require('webdriverio');
var path = require('path');
var $ = require('async');
var fs = require('fs');
var submitAndCompare = require('../../submit');
var captureAndCrop = require('../../capture');

var appConfig;
var browserCrop = {
    chrome: true
};

module.exports = function (config, options) {
    appConfig = config;
    process.on('uncaughtException', (err) => {
        console.error(`Caught exception: ${JSON.stringify(err)}`);
        throw err;
    });

    var bsOptions = {
        "logLevel": options.verbose ? "verbose" : "silent",
        "desiredCapabilities": {
            browserName: options.browser,
            platform: "MAC",
            "browserstack.local": options.browserstackLocal
        },
        "user": process.env.BROWSERSTACK_USER,
        "key": process.env.BROWSERSTACK_KEY,
        "host": 'hub.browserstack.com',
        "phantomjs.binary.path": 'node_modules/.bin/phantomjs'
    };

    var client = webdriverio.remote(bsOptions).init();

    runTests(client, config, options, (err, results) => {
        if (err) {
            console.error(`Run Tests Error! ${err}`);
            throw err;
        }
        console.log('Finished Tests. Comparing Results.');
        submitAndCompare(config.scholarUrl, results, handleImageComparison);
    });

};

function runTests(client, config, options, completionCallback) {

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

    if(err) {
        console.error(`Error passed to handleImageComparison! ${err}`);
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
        console.error(`${errorArray.length} Failures`);
        console.table(errorArray);
        process.exit(1)
    } else {
        console.log('No errors!');
        process.exit();
    }
}