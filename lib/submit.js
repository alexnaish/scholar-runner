var dir = require('node-dir');
var path = require('path');
var fs = require('fs');
var $ = require('async');
var request = require('request');

module.exports = function (scholarUrl, imageResults, callback) {

    var imageComparisionFns = [];
    imageResults.forEach(function (image) {
        imageComparisionFns.push(function (submissionCallback) {

            fs.readFile(image.filePath, function (err, data) {
                if (err) throw err;
                var fileData = data.toString('base64');

                request({
                    method: 'POST',
                    url: scholarUrl + '/api/screenshot/' + image.name,
                    headers: {
                        'X-Scholar-Meta-Browser': image.browser,
                        'X-Scholar-Meta-Resolution': image.resolution
                    },
                    form: {
                        imageData: fileData
                    }
                }, function (err, httpResponse, body) {
                    try {
                        var resp = JSON.parse(body);
                        resp.name = image.name;
                        return submissionCallback(err, resp);
                    } catch (e) {
                        submissionCallback(e);
                    }
                });
            });
        });
    });

    $.parallel(imageComparisionFns, function (err, results) {
        if (err) {
            console.error('Image Submit / Compare Errored!', err);
            throw err;
        }
        callback(err, results);
    });

};
