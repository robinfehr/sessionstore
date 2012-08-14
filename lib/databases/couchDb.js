var util = require(process.binding('natives').util ? 'util' : 'sys')
  , Session = require('express').session
  , _ = require('lodash')
  , async = require('async')
  , cradle = require('cradle');

var CouchDbSessionStore = function(options, callback) {
    options = options || {};
    Session.Store.call(this, options);

    var defaults = {
        host: 'http://localhost',
        port: 5984,
        dbName: 'express-sessions',
        collectionName: 'sessions'
    };
    
    _.defaults(options, defaults);

    var defaultOpt = {
        cache: true,
        raw: false//,
        // secure: true,
        // auth: { username: 'login', password: 'pwd' }
    };

    options.options = options.options || {};

    _.defaults(options.options, defaultOpt);

    var self = this;
    var client = new(cradle.Connection)(options.host, options.port, options.options);
    var db = client.database(options.dbName);
    db.exists(function (err, exists) {

        function finish() {
            self.client = client;
            self.db = db;
            self.isConnected = true;

            db.get('_design/collection', function(err, obj) {

                var view = {
                    views: {
                        findAll: {
                            map: function(doc) {
                                emit(doc.collectionName, doc);
                            }
                        }
                    }
                };

                if (err && err.error == 'not_found') {
                    db.save('_design/collection', view, function(err) {
                        if (callback) { return callback(null); }
                    });
                } else if (err) {
                   if (callback) { return callback(err); }
                } else {
                    db.save('_design/collection', obj._rev, view, function(err) {
                        if (callback) { return callback(null); }
                    });
                }

            });
        }

        if (err) {
            if (callback) { return callback(err); }
        } else if (!exists) {
            db.create(function(err) {
                finish();
            });
        } else {
            finish();
        }    
    });
};

util.inherits(CouchDbSessionStore, Session.Store);

CouchDbSessionStore.prototype.set = function (hash, sess, callback) {
    sess.collectionName = this.collectionName;
    this.db.save(hash, sess, callback);
};

CouchDbSessionStore.prototype.get = function (hash, callback) {
    this.db.get(hash, callback);
};

CouchDbSessionStore.prototype.destroy = function(hash, callback) {
    this.db.remove(hash, callback);
};

CouchDbSessionStore.prototype.all = function(callback) {
    this.db.view('collection/findAll', { key: this.collectionName }, function(err, docs) {
        var res = [];

        for(var i = 0, len = docs.length; i < len; i++){
            var obj = docs[i].value;
            obj.id = obj._id;
            var found = _.find(res, function(r) {
                return r.id === obj.id;
            });

            if (!found) {
                res.push(obj);
            }
        }

        callback(err, res);
    });
};

CouchDbSessionStore.prototype.length = function(callback) {
    this.all(function(err, res) {
        callback(res.length);
    });
};

CouchDbSessionStore.prototype.clear = function(callback) {
    var self = this;
    this.all(function(err, results) {
        async.forEach(results, function(item, clb) {
            self.db.remove(item._id, item._rev, clb);
        }, function(err) {
            callback(err);
        });
    });
};

module.exports = CouchDbSessionStore;