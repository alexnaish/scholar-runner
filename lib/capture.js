'use strict';

const jimp = require('jimp');
const path = require('path');

module.exports = function captureAndCrop(name, imageBuffer, cropRectangle, options, callback) {

    let targetFileName = path.join(process.cwd(), `test_out/images/${options.browser}-${name}.png`);
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
                    name: name,
                    filePath: targetFileName,
                    browser: options.browser,
                    resolution: cropRectangle.width + 'x' + cropRectangle.height
                })
            });
    });
};