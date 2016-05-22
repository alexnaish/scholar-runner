'use strict';

const jimp = require('jimp');
const path = require('path');

module.exports = function captureAndCrop(scenario, imageBuffer, cropRectangle, options, callback) {

    let targetFileName = path.join(process.cwd(), options.output, `${options.browser}-${scenario.name}.png`);
    jimp.read(imageBuffer, function (err, image) {
        if (err) {
            console.error('image error', err);
            return callback(err);
        }

        const x = cropRectangle.left;
        const y = cropRectangle.top;
        const w = cropRectangle.width;
        const h = cropRectangle.height;

        image
            .crop(x, y, w, h)
            .write(targetFileName, function () {
                callback(null, {
                    scenario: scenario,
                    filePath: targetFileName,
                    browser: options.browser,
                    resolution: Math.floor(cropRectangle.width) + 'x' + Math.floor(cropRectangle.height)
                })
            });
    });
};
