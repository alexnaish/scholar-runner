var dir = require('node-dir');
var path = require('path');

module.exports = function(directory, suite, subset, callback) {
  dir.files(path.join(process.cwd(), directory), function (err, files) {
    if (err) throw err;
    var specsToRun = [];

    function filterBySuite(filePath) {
      var fileName = path.basename(filePath);
      return fileName.includes('-spec.js') && fileName.includes(suite || '');
    }
    var filteredResults = files.filter(filterBySuite);

    filteredResults.forEach(function(file){
      specsToRun = specsToRun.concat(require(file)[subset] || []);
    });

    callback(specsToRun);
  });
};
