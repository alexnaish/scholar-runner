var dir = require('node-dir');
var path = require('path');
var fs = require('fs');
var $ = require('async');
var request = require('request');
var scholarCompare = require('scholar-comparison');

module.exports = function (baselineDirectory, imageResults, callback) {
    var imageComparisionFns = [];

    imageResults.forEach(function (image) {
      imageComparisionFns.push(function (submissionCallback) {
        try {
          var baselineImage =  path.join(process.cwd(), baselineDirectory, `${image.browser}-${image.scenario.name}.png`);

          fs.exists(baselineImage, (exists) => {
            if (exists) {
              scholarCompare(image.filePath, baselineImage, (err, result) => {
                result.name = image.scenario.name;
                result.baselineImage = baselineImage;
                result.image = image.filePath;
                result.passes = result.misMatchPercentage < '0.1' && result.isSameDimensions;
                submissionCallback(err, result);
              });
            } else {
              fs.readFile(image.filePath, (err, image) => {
                if (err) {
                  submissionCallback(err);
                }
                fs.writeFile(baselineImage, image, (err) => {
                    if (err) throw err;
                    submissionCallback(null, {passes: true});
                });
              });

            }
          });
        } catch (e) {
          console.error(e.stack);
          submissionCallback(e);
        }

      });
    });

    $.parallelLimit(imageComparisionFns, 10, function (err, results) {
        if (err) {
            console.error('Image Submit / Compare Errored!', err);
            throw err;
        }
        callback(err, results);
    });
};
