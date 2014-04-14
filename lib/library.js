'use strict';

var fs = require('fs');
var path = require('path');

exports.getExpressSession = function () {
    // get express version
    var file = path.join(__dirname, '/..', 'node_modules', 'express', 'package.json');
    var exists = fs.existsSync(file);

    if (!exists) {
        throw new Error('No express found.');
    }

    // read out major version
    var buffer = fs.readFileSync(file);
    var version = JSON.parse(buffer).version.split('.')[0];
    version = parseInt(version);

    if (version < 4) {
        return require('express').session;
    } else if (version === 4) {
        file = path.join(__dirname, '/..', 'node_modules', 'express-session', 'package.json');
        exists = fs.existsSync(file);

        if (!exists) {
            throw new Error('No express-session found.');
        }

        return require('express-session');
    } else {
        throw new Error('Express version number is higher than 4');
    }
};
