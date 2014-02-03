# Introduction

[![Build Status](https://secure.travis-ci.org/adrai/sessionstore.png)](http://travis-ci.org/adrai/session)

Sessionstore is a node.js module for multiple databases. It can be very useful if you work with express or connect.

# Installation

    $ npm install sessionstore

# Usage

## Connecting to in-memory

	var sessionstore = require('sessionstore');

    var express = require('express');
    var app = express();

    app.use(express.session({
        store: sessionstore.createSessionStore()
    }));

## Connecting to mongodb

    var sessionstore = require('sessionstore');

    var express = require('express');
    var app = express();

    app.use(express.session({
        store: sessionstore.createSessionStore({
            type: 'mongoDb',
            host: 'localhost',         // optional
            port: 27017,               // optional
            dbName: 'sessionDb',       // optional
            collectionName: 'sessions' // optional
        })
    }));

## Connecting to nstore

    var sessionstore = require('sessionstore');

    var express = require('express');
    var app = express();

    app.use(express.session({
        store: sessionstore.createSessionStore({
            type: 'nStore',
            dbFile: __dirname + '/sessions.db'  //optional
        })
    }));


# Database Support
Currently these databases are supported:

1. inMemory
2. mongodb ([node-mongodb-native] (https://github.com/mongodb/node-mongodb-native))
3. nstore ([nstore] (https://github.com/creationix/nstore))
4. couchdb ([cradle] (https://github.com/cloudhead/cradle))
5. tingodb ([tingodb] (https://github.com/sergeyksv/tingodb))

# License

Copyright (c) 2014 Adriano Raiano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.