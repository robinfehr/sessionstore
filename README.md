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
            timeout: 10000             // optional
            // authSource: 'authedicationDatabase',        // optional
      	    // username: 'technicalDbUser',                // optional
      	    // password: 'secret'                          // optional
            // url: 'mongodb://user:pass@host:port/db?opts // optional
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
            timeout: 10000             // optional
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
            collectionName: 'sessions',// optional
            timeout: 10000             // optional
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
            timeout: 10000             // optional
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
            retries: 2,                // optional
            failover: false,           // optional
            failoverTime: 60,          // optional
            timeout: 10000             // optional
        })
    }));

## Connecting to elasticsearch

    var sessionstore = require('sessionstore');

    var express = require('express');
    var app = express();

    app.use(express.session({
        store: sessionstore.createSessionStore({
            type: 'elasticsearch',
            host: 'localhost:9200',    // optional
            prefix: '',                // optional
            index: 'express',          // optional
            typeName: 'session',       // optional
            pingInterval: 1000,        // optional
            timeout: 10000             // optional
        })
    }));

## Catch connect and disconnect events

    var ss = sessionstore.createSessionStore({ type: 'mongodb' }, function(err, ss) {
        console.log('hello from callback');
        // use store here...
        // app.use(express.session({
        //     store: ss
        // }));
    });
    ss.on('connect', function() {
        console.log('hello from event');
        // or here
        // app.use(express.session({
        //     store: ss
        // }));
    });
    ss.on('disconnect', function() {
        console.log('bye');
    });

#[Release notes](https://github.com/adrai/sessionstore/blob/master/releasenotes.md)

# Database Support
Currently these databases are supported:

1. inmemory
2. mongodb ([node-mongodb-native] (https://github.com/mongodb/node-mongodb-native))
3. couchdb ([cradle] (https://github.com/cloudhead/cradle))
4. tingodb ([tingodb] (https://github.com/sergeyksv/tingodb))
5. redis ([redis] (https://github.com/mranney/node_redis))
6. memcached ([memjs] (https://github.com/alevy/memjs))
7. elasticsearch ([elasticsearch] (https://github.com/elastic/elasticsearch-js))


# License

Copyright (c) 2018 Adriano Raiano

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
