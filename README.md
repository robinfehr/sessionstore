# Introduction

[![travis](https://img.shields.io/travis/adrai/sessionstore.svg)](https://travis-ci.org/adrai/sessionstore) [![npm](https://img.shields.io/npm/v/sessionstore.svg)](https://npmjs.org/package/sessionstore)

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
            type: 'mongodb',
            host: 'localhost',         // optional
            port: 27017,               // optional
            dbName: 'sessionDb',       // optional
            collectionName: 'sessions',// optional
            reapInterval: 600000,      // optional
            maxAge: 1000 * 60 * 60 * 2 // optional
        })
    }));

## Connecting to tingodb

    var sessionstore = require('sessionstore');

    var express = require('express');
    var app = express();

    app.use(express.session({
        store: sessionstore.createSessionStore({
            type: 'tingodb',
            dbPath: __dirname + '/',   // optional
            collectionName: 'sessions',// optional
            reapInterval: 600000,      // optional
            maxAge: 1000 * 60 * 60 * 2 // optional
        })
    }));

## Connecting to couchdb

    var sessionstore = require('sessionstore');

    var express = require('express');
    var app = express();

    app.use(express.session({
        store: sessionstore.createSessionStore({
            type: 'couchdb',
            host: 'http://localhost',  // optional
            port: 5984,                // optional
            dbName: 'express-sessions',// optional
            collectionName: 'sessions' // optional
        })
    }));

## Connecting to nstore

    var sessionstore = require('sessionstore');

    var express = require('express');
    var app = express();

    app.use(express.session({
        store: sessionstore.createSessionStore({
            type: 'nstore',
            dbFile: __dirname + '/sessions.db',  //optional
            maxAge: 3600000           //optional
        })
    }));

## Connecting to redis

    var sessionstore = require('sessionstore');

    var express = require('express');
    var app = express();

    app.use(express.session({
        store: sessionstore.createSessionStore({
            type: 'redis',
            host: 'localhost',         // optional
            port: 6379,                // optional
            prefix: 'sess',            // optional
            ttl: 804600                // optional
        })
    }));

## Connecting to memcached

    var sessionstore = require('sessionstore');

    var express = require('express');
    var app = express();

    app.use(express.session({
        store: sessionstore.createSessionStore({
            type: 'memcached',
            host: 'localhost',         // optional
            port: 11211,               // optional
            prefix: 'sess',            // optional
            expires: 80,               // optional
            retries: 2,                // optional
            failover: false,           // optional
            failoverTime: 60           // optional
        })
    }));


# Database Support
Currently these databases are supported:

1. inMemory
2. mongodb ([node-mongodb-native] (https://github.com/mongodb/node-mongodb-native))
3. nstore ([nstore] (https://github.com/creationix/nstore))
4. couchdb ([cradle] (https://github.com/cloudhead/cradle))
5. tingodb ([tingodb] (https://github.com/sergeyksv/tingodb))
6. redis ([redis] (https://github.com/mranney/node_redis))
7. memcached ([memjs] (https://github.com/alevy/memjs))


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
