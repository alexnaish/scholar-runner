'use strict';

module.exports = function (options) {

    var selenium = require('selenium-standalone');
    var webdriverio = require('webdriverio');
    var options = {desiredCapabilities: {browserName: 'phantomjs'}};
    var client = webdriverio.remote(options);
    var path = require('path');

    var conf = {
        // https://selenium-release.storage.googleapis.com/index.html
        version: '2.53.0',
        baseURL: 'https://selenium-release.storage.googleapis.com',
        drivers: {
            chrome: {
                // https://chromedriver.storage.googleapis.com/index.html
                version: '2.21',
                arch: process.arch,
                baseURL: 'https://chromedriver.storage.googleapis.com'
            }
        },
        logger: function (message) {
            console.log('message', message)
        }
    };

    selenium.install(conf, err => {
        if (err) {
            console.error(`Installation Error! ${err}`);
            throw err;
        }

        selenium.start({}, function (err, childProcess) {

            if (err) {
                console.error(`Start Error! ${err}`);
                throw err;
            }

            client
                .init()
                .url('https://duckduckgo.com/')
                .setValue('#search_form_input_homepage', 'WebdriverIO')
                .click('#search_button_homepage')
                .saveScreenshot(path.join(process.cwd(), 'test_out/images/test.png'))
                .end()
                .then(() => {
                    process.exit();
                    childProcess.exit();
                });
        });

    });


};
