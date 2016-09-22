# scholar-runner
NPM command line module for running visual regression tests

## Synopsis

This is the client test runner for usage with the [Scholar application](http://github.com/alexnaish/scholar).

## Installation

`npm install scholar-runner --save-dev`

## Usage

`scholar-runner --help`

    Usage: scholar-runner [options]

      Options:

        -h, --help                       output usage information
        -V, --version                    output the version number
        -b, --browser <option>           Define test browser (defaults to "phantomjs")
        -r, --runner <option>            Define the runner for the tests e.g. local, remote (defaults to "local")
        --seleniumVersion <version>      Optionally use a specific selenium version
        --verbose                        Define selenium log level
        -s, --suite <suite>              Define file to run (optional)
        -t, --type <key>                 Define subset of tests to run (optional)
        -c, --config <filePath>          Define config file location (defaults to "config/scholar.js")
        -d, --directory <testDirectory>  Define test files directory (defaults to "process.cwd()/test/")
        -o, --output <imageDirectory>    Define directory to place screenshots (defaults to "process.cwd()/test_images/")

## Setup

### Config

Add a config file,

    module.exports = {
      baseUrl: 'http://the-website-you-want-to-test.com',
      scholarUrl: 'http://your-scholar-instance.com'
    };


### Adding Global Cookies to Config

Add required cookies to your config file,

    module.exports = {
      baseUrl: 'http://the-website-you-want-to-test.com',
      scholarUrl: 'http://your-scholar-instance.com',
      cookies: [{
          'name': 'example',
          'value': 'exampleValue',
          'domain': '.example.com'
      }]
    };

### Remote

To run on a remote Selenium server you will need to:

* Set the runner flag to remote
* Set the Host (required) and Port number (optional) up in your config

For Example:

    module.exports = {
          baseUrl: 'http://the-website-you-want-to-test.com',
          scholarUrl: 'http://your-scholar-instance.com'
          host: 'http://your-Selenium-server.com',
          port: 'your-Selenium-server-port'
    };


To run on browserstack you will need to:

* Define the `browserstack.user` variable as your browserstack user in your config.
* Define the `browserstack.key` variable as your browserstack automation key in your config.
* If you want to test somewhere not internet accessible (localhost / internal domain etc) you will need to start up the browserstack local tunnel CLI. It's not included with this package, however it is easy to setup like:
    * wget https://www.browserstack.com/browserstack-local/BrowserStackLocal-`YOURENVNAME`-x64.zip && unzip BrowserStackLocal-`YOURENVNAME`-x64.zip
    * ./BrowserStackLocal -v -onlyAutomate -forcelocal $BROWSERSTACK_KEY &
* If you want more options then pass in 'browserstack' object in your appConfig, which will be used as your browser desiredCapabilities. 
* If you need to run browserstack over a local/private connection add 'browserstack.local' : true to the config file 

An Example browserstack config:

    {
        browserstack: {
            user: 'browserstack-user-name',
            key: 'browserstack-automation-key',
            'browserstack.local' : true,
            ie: {
                browser: 'IE',
                browser_version: '11',
                os: 'Windows',
                os_version: '8.1'
            },
            edge: {
                browser: 'Edge',
                browser_version: '12',
                os: 'Windows',
                os_version: '10'
            },
            safari: {
                browser: 'Safari',
                browser_version: '9.1',
                os: 'OS X',
                os_version: 'El Capitan'
            },
            chrome: {
                browser: 'Chrome',
                browser_version: '47',
                os: 'Windows',
                os_version: '7'
            }
        }
    }

## Writing Specs

### Your first spec file


Within your test directory (defaults to test/) add your spec file. Ensure the ending contains '-spec.js';

    let desktopSpecs = [
        {
            name: 'desktop-test-1',
            selector: 'body',
            path: '/'
        },
        {
            name: 'alex-test',
            selector: 'body',
            path: '/'
        }
    ];

    let otherSpecs = [
        {
            name: 'other-test-1',
            selector: 'body',
            path: '/'
        },
        {
            name: 'other-test-2',
            selector: 'body',
            path: '/'
        }
    ];

    module.exports = {
        desktop: desktopSpecs,
        another: otherSpecs,
        all: desktopSpecs.concat(otherSpecs) // default if no --type is provided
    };

### Advanced Options

There are other possible spec options such as:

* name: String that will be the unique identifier within Scholar.
    * Example = "TestHeaderDesktop"
* selector: CSS Selector to target specific elements.
    * Example = ".main.header"
* url: Optional override of the global baseUrl.
    * Example = "alternative.domain.testing.com"
* path: URL path to target page.
    * Example = "/myTestPage"
* labels: An array allowing labelling / tagging of images for use within scholar
    * Example = ['homepage', 'carousel', 'hero']
* loadTimeout: Milliseconds to allow page to stabilise before taking a screenshot (Defaults to 2000).
    * Example = 5000
* setup: function that will be passed to the runner to allow events to happen after page loads (click on an accordion heading etc). **MUST return the client**
    * Example = `function(client) {
        return client.waitForVisible('.n-button', 5000).click('.n-button');
     }`
* setupTimeout: Milliseconds to allow page to stabilise after running a setup function (Defaults to 0).
    * Example = 2000
* waitTimeout: Milliseconds to wait for required element to become visible (Defaults to 3000).
    * Example = 5000
* viewportSize: JS Object with width and height properties.
    * Example = {width: 1280, height: 720}
* cookies: Same format as the config options, however will only be included for the specific test.
    * Example = `[
                    {
                        name: 'first',
                        value: 'test'
                    },
                    {
                        name: 'second',
                        value: 'another'
                    }
                ]`


## License

[GNU](LICENSE)
