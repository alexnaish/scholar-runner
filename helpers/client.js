const webdriverio = require('webdriverio');

module.exports = function (config = {}, options = {}) {
  let browserOptions = config.capabilitiesMap && config.capabilitiesMap[options.browser] || {
          browserName: options.browser || 'chrome',
          platform: "ANY"
      };
  let baseOptions = {
      "logLevel": options.verbose ? "verbose" : "silent",
      "desiredCapabilities": browserOptions,
      "phantomjs.binary.path": 'node_modules/.bin/phantomjs'
  };

  let webdriverConfig = Object.assign(baseOptions, config);

  return webdriverio.remote(webdriverConfig).init();
};
