'use strict';

var mkdirp = require('mkdirp');
var path = require('path');

module.exports = function (programOptions, requiredKeys) {

    requiredKeys.forEach(key => {
        if (programOptions[key]) {
            let dir = path.join(process.cwd(), programOptions[key]);
            console.log(`Creating ${key} directory: ${dir}`);
            mkdirp.sync(dir);
        }
    })

};
