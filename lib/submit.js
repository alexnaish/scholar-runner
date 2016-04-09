var dir = require('node-dir');
var path = require('path');
var fs = require('fs');
var async = require('async');
var request = require('request');

module.exports = function(scholarUrl){

  dir.files('./test_out/images', function(err, images){

    var imageComparisionFns = [];

    images.forEach(function(imagePath){
      imageComparisionFns.push(function(callback){
        var name = path.basename(imagePath).slice(0, -4);
        console.log('name', name)
        request.post(scholarUrl + '/api/screenshot/' + name, {
            form: {
                imageData: fs.readFileSync(imagePath).toString('base64')
            }
        }, function (err, httpResponse, body) {
            try {
                callback(err, JSON.parse(body));
            } catch (e) {
                console.error('Error thrown!', err.code);
                callback(err, body);
            }
        });
      });
    });

    async.parallel(imageComparisionFns, function(err){
      if(err) {
        console.error('Image Submit / Compare Errored!', err);
        throw err;
      }
      console.log('Completed Image Comparisons!');
    });

  });
};
