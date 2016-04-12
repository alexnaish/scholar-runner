module.exports = function () {

    var bsOptions = {
        "logLevel": "verbose",
        "desiredCapabilities": {
            browserName: options.browser
        },
        "user": "nowtvwebsales1",
        "key": "RsGTcZifcKxicFUxV4hm",
        "host": 'hub.browserstack.com'
    };

    var webdriverio = require('webdriverio');
    var client = webdriverio.remote(bsOptions);
    var path = require('path');

    client
        .init()
        .url('https://duckduckgo.com/')
        .setValue('#search_form_input_homepage', 'WebdriverIO')
        .click('#search_button_homepage')
        .saveScreenshot(path.join(process.cwd(), 'test_out/images/test.png'))
        .end()
        .then(() => {
            //childProcess.kill();
            process.exit();
        })
        .catch((e) => {
            console.error('e!!!!', e);
            throw e;
        });

};