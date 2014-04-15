'use strict';

var fs = require('fs');
var path = require('path');

exports.getExpressSession = function () {
    // get express version
    
    var expressPkg;

    try {
        expressPkg = require('express/package.json');
    } catch (err) {
        throw new Error('No express found.');
    }

    var version = parseInt(expressPkg.version.split('.')[0], 10);

    if (version < 4) {
        return require('express').session;
    } else if (version === 4) {
        var expressSessPkg;

        try {
            expressSessPkg = require('express-session/package.json');
        } catch (err) {
            throw new Error('No express-session found.');
        }

        return require('express-session');
    } else {
        throw new Error('Express version number is higher than 4');
    }
};
