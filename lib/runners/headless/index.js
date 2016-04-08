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

      async.waterfall(scenarioFns, function(err) {
        page.close();
        phantomInstance.exit(err);
        submitAndCompare(config.scholarUrl);
        console.log("Tests complete.");
      });
    })
    .catch(function(error) {
      console.error(error);
      page.close();
      phInstance.exit();
    });

  var scenarioFns = options.scenarios.map(function(scenario) {
    return function(callback) {
      console.log('-------------------------------');
      console.log('running scenario', scenario.name);
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
                capture.selector(page, process.cwd() + '/test_out/images/' + scenario.name + '.png', scenario.selector, function() {
                  callback();
                });
              }, scenario.setupTimeout)

            }, scenario.loadTimeout || 2000);

          }
        });
    };
  });

}
