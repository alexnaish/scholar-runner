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
    
        -h, --help                       Output usage information
        -V, --version                    Output the version number
        -b, --browser <option>           Define test browser (defaults to "phantomjs")
        -s, --suite <suite>              Define file to run (optional)
        -t, --type <key>                 Define subset of tests to run (optional)
        -c, --config <filePath>          Define config file location (defaults to "process.cwd()/config/scholar.js")
        -d, --directory <testDirectory>  Define test files directory (defaults to "process.cwd()/test/")

## Setup

### Config

Add a config file, 

    module.exports = {
      baseUrl: 'http://the-website-you-want-to-test.com',
      scholarUrl: 'http://your-scholar-instance.com'
    };


### Adding Cookies to Config

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
* path: URL path to target page. 
    * Example = "/myTestPage"
* loadTimeout: Milliseconds to allow page to stabilise before taking a screenshot (Defaults to 2000). 
    * Example = 5000
* setup: function that will be evaluated within the browser to allow events to happen after page loads (click on an accordion heading etc). 
    * Example = `function () {
        $('.faq-question-2').click();
    }`
* setupTimeout: Milliseconds to allow page to stabilise after running a setup function (Defaults to 0). 
    * Example = 2000
* windowSize: JS Object with width and height properties. 
    * Example = {width: 1280, height: 720}  
    

## License

[GNU](LICENSE)