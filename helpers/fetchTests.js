'use strict';

const dir = require('node-dir');
const path = require('path');

function filterBySuite(suite, filePath) {
  const fileName = path.basename(filePath);
    console.log("fileName.includes(suite || '')", fileName.includes(suite || ''));
    console.log("fileName", fileName);
    return fileName.includes('-spec.js') && fileName.includes(suite || '');
}

module.exports = function(directory, suite, subset, callback) {

    dir.files(path.join(process.cwd(), directory), (err, files) => {

        if (err) {
          throw err;
        }

        const filteredResults = files
            .filter(filterBySuite.bind(null, suite))
            .reduce((acc, file) => {
                return acc.concat(require(file)[subset] || []);
            }, []);

        callback(filteredResults);
    });
};
