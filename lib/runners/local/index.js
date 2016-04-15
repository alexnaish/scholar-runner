'use strict';

module.exports = function (options) {

    require('console.table');
    var selenium = require('selenium-standalone');
    var webdriverio = require('webdriverio');
    var path = require('path');
    var $ = require('async');
    var fs = require('fs');
    var jimp = require('jimp');
    var submitAndCompare = require('../../submit');

    var config = require(path.join(process.cwd(), options.config));

    var wdOptions = {
        "logLevel": options.verbose ? "verbose" : "silent",
        "desiredCapabilities": {
            browserName: options.browser
        },
        "phantomjs.binary.path": 'node_modules/.bin/phantomjs'
    };

    var conf = {
        version: '2.53.0',
        baseURL: 'https://selenium-release.storage.googleapis.com',
        logger: message => {
            if (options.verbose) {
                console.log(message)
            }
        }
    };

    selenium.install(conf, err => {

        if (err) {
            console.error(`Selenium installation Error! ${err}`);
            throw err;
        }

        selenium.start({}, function (err, childProcess) {

            if (err) {
                console.error(`Selenium start Error! ${err}`);
                throw err;
            }

            var client = webdriverio.remote(wdOptions).init();
            var cookies = config.cookies || [];
            cookies.forEach(cookie => {
                client.setCookie(cookie);
            });

            var scenarioFns = options.scenarios.map(scenario => generateScenarioThunk.bind(null, client, scenario));

            function generateScenarioThunk(client, scenario, callback) {
                console.log(`Running ${scenario.name}`);

                const uri = (scenario.url || config.baseUrl) + scenario.path;
                const selector = scenario.selector || 'body';
                const setupFunction = scenario.setup || function () {};
                const viewportSize = scenario.viewportSize || {width: 1280, height: 900};

                client
                    .url(uri)
                    .setViewportSize(viewportSize)
                    .pause(scenario.loadTimeout || 2000)
                    .execute(setupFunction)
                    .pause(scenario.setupTimeout || 0)
                    .execute(function (selector) {
                        var element = document.querySelector(selector);
                        return element.getBoundingClientRect();
                    }, selector)
                    .then(boundingClientRect => {
                        return boundingClientRect.value;
                    }).then(elementBox => {

                        const cropScreenshot = cropImage.bind(null, callback, elementBox, scenario.name);

                        return client
                            .saveScreenshot(path.join(process.cwd(), `test_out/images/${options.browser}-${scenario.name}-beforecrop.png`))
                            .then(cropScreenshot)

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

            function cropImage(callback, cropRectangle, name, imagePath) {
                jimp.read(imagePath, function (err, image) {

                    if (err) {
                        console.error('image error', err);
                        return callback(err);
                    }

                    const x = cropRectangle.left;
                    const y = cropRectangle.top;
                    const w = cropRectangle.width;
                    const h = cropRectangle.height;
                    var targetFileName = path.join(process.cwd(), `test_out/images/${options.browser}-${name}.png`);
                    image
                        .crop(x, y, w, h)
                        .write(targetFileName, function () {
                            callback(null, {
                                name: name,
                                filePath: targetFileName,
                                browser: options.browser,
                                resolution: cropRectangle.width + 'x' + cropRectangle.height
                            })
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
                        submitAndCompare(config.scholarUrl, results, handleImageComparison);
                    });

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

                    childProcess.kill();

                    if (errorArray.length) {
                        console.error(`${errorArray.length} Failures`);
                        console.table(errorArray);
                        process.exit(1)
                    } else {
                        process.exit();
                    }
                }

            });

        });

    });
};