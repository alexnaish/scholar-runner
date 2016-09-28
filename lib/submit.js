'use strict';

const dir = require('node-dir');
const path = require('path');
const fs = require('fs');
const $ = require('async');
const request = require('request');

module.exports = (scholarUrl, imageResults, callback) => {

    const imageComparisionFns = imageResults.map((image) => {
        const labels = image.scenario.labels || [];
        return (submissionCallback) => {
            fs.readFile(image.filePath, (err, data) => {
                if (err) throw err;
                const fileData = data.toString('base64');
                request.post(`${scholarUrl}/api/screenshot/${image.scenario.name}`, {
                    headers: {
                        'X-Scholar-Meta-Browser': image.browser,
                        'X-Scholar-Meta-Resolution': image.resolution,
                        'X-Scholar-Meta-Labels': labels.join(', ')
                    },
                    form: {
                        imageData: fileData
                    }
                }, (err, httpResponse, body) => {
                    try {
                        const resp = JSON.parse(body);
                        resp.name = image.scenario.name;
                        return submissionCallback(err, resp);
                    } catch (e) {
                        console.error(`Error! ${e} occurred. Scholar response was: ${body}`);
                        submissionCallback(e);
                    }
                });
            });
        };
    });

    $.parallelLimit(imageComparisionFns, 5, (err, results) => {
        if (err) {
            console.error('Image Submit / Compare Errored!', err);
            throw err;
        }
        callback(err, results);
    });

};
