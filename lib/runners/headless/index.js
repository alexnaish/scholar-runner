module.exports = function(options) {

  var phantom = require('phantom');
  var async = require('async');
  var config = require(options.config);
  var capture = require('./capture');
  var submitAndCompare = require('../../submit');
  var phantomInstance;

  var page;

  phantom.create(['--ignore-ssl-errors=yes'])
    .then((instance) => {
      phantomInstance = instance;
      return instance.createPage();
    })
    .then(function(pageInstance) {
      page = pageInstance;

      if (config.cookies) {
        config.cookies.forEach(function(cookie) {
          page.addCookie(cookie);
        });
      }
      async.parallel(scenarioFns, function(error, results) {
        if(error) {
          console.log("Error returned from image capture", error);
        }
        page.close();
        phantomInstance.exit();
        console.log("Tests complete.");
        submitAndCompare(config.scholarUrl, results, function(err, results){
            console.log('Final process complete, images submitted and compared.', results);
            process.exit();
        });

      });
    })
    .catch(function(error) {
      console.error('Error in phantom creation steps: ', error);
      page.close();
      phInstance.exit();
      throw error;
    });

  var scenarioFns = options.scenarios.map(function(scenario) {
    return function(callback) {
      console.log('Running scenario: ', scenario.name);
      page.open(scenario.url || config.baseUrl)
        .then(function(status) {
          if (status !== 'success') {
            console.error('Failed to load browser for ', url, status);
            return callback();
          } else {
            page.property('viewportSize', scenario.windowSize || {
              width: 1280,
              height: 720
            });
            setTimeout(function() {
              if (scenario.setup) {
                page.evaluate(scenario.setup);
              }
              setTimeout(function() {
                capture.selector(page, scenario.name, scenario.selector || 'body', callback);
              }, scenario.setupTimeout)
            }, scenario.loadTimeout || 2000);

          }
        });
    };
  });

}
