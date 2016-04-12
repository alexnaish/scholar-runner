'use strict';

module.exports = function (options) {

    require('console.table');
    var phantom = require('phantom');
    var path = require('path');
    var $ = require('async');
    var config = require(path.join(process.cwd(), options.config));
    var capture = require('./capture');
    var submitAndCompare = require('../../submit');
    var phantomInstance;

    var page;

    phantom.create(['--ignore-ssl-errors=yes'])

        .then(instance => {
            phantomInstance = instance;
            return instance.createPage();
        })

        .then(pageInstance => {
            page = pageInstance;

            if (config.cookies) {
                config.cookies.forEach(cookie => {
                    page.addCookie(cookie);
                });
            }

            $.series(scenarioFns, (error, results) => {
                if (error) {
                    console.log("Error returned from image capture", error);
                }
                page.close();
                phantomInstance.exit();
                console.log("Tests complete.");
                submitAndCompare(config.scholarUrl, results, (err, comparisonResults) => {
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
                });

            });

        })
        .catch(error => {
            console.error('Error in phantom creation steps: ', error);
            page.close();
            phantomInstance.exit();
            throw error;
        });

    var scenarioFns = options.scenarios.map(scenario => callback => {
        console.log('Running scenario: ', scenario.name);

        page.open(uri)
            .then(status => {
                if (status !== 'success') {
                    console.error('Failed to load browser for ', url, status);
                    return callback();
                } else {
                    page.property('viewportSize', scenario.windowSize || {
                            width: 1280,
                            height: 720
                        });
                    setTimeout(function () {
                        if (scenario.setup) {
                            page.evaluate(scenario.setup);
                        }
                        setTimeout(function () {
                            capture.selector(page, scenario.name, scenario.selector || 'body', callback);
                        }, scenario.setupTimeout)
                    }, scenario.loadTimeout || 2000);
                }
            });
    });
};
