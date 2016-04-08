module.exports = function(options) {

  var phantom = require('phantom');
  var async = require('async');
  var config = require(options.config);
  var capture = require('./capture');
  var phantomInstance;

  var page;

  phantom.create(['--ignore-ssl-errors=yes'])
    .then((instance) => {
      phantomInstance = instance;
      return instance.createPage();
    })
    .then(function(pageInstance) {
      page = pageInstance;

      page.onConsoleMessage = function(msg, lineNum, sourceId) {
        console.log('BROWSER CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
      };

      if (config.cookies) {
        config.cookies.forEach(function(cookie) {
          page.addCookie(cookie);
        });
      }

      async.waterfall(scenarioFns, function(err) {
        page.close();
        phantomInstance.exit(err);
        console.log("Tests complete.");
      });
    })
    .catch(function(error) {
      console.error(error);
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
            callback();
          } else {
            page.property('viewportSize', scenario.windowSize || {
              width: 1280,
              height: 720
            });
            setTimeout(function() {
              capture.selector(page, process.cwd() + '/test_out/images/' + scenario.name + '.png', scenario.selector, function() {
                callback();
              });
            }, scenario.loadTimeout || 2000);

          }
        });
    };
  });

}
