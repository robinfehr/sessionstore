var util = require(process.binding('natives').util ? 'util' : 'sys')
  , Session = require('express').session
  , mongo = require('mongodb')
  , ObjectID = mongo.BSONPure.ObjectID
  , _ = require('lodash');

function cleanSessionData(json) {
    var data = {};
    for (var i in json) {
        data[i] = json[i];
        if (data[i] instanceof Object) {
            if ('low_' in data[i] || 'high_' in data[i]) {
                data[i] = data[i].toNumber();
            }
        }
        
    }
    return data;
}

var MongoSessionStore = function(options, callback) {
    options = options || {};
    Session.Store.call(this, options);

    var self = this;

    var defaults = {
        host: 'localhost',
        port: 27017,
        dbName: 'express-sessions',
        collectionName: 'sessions',
        reapInterval: 600000,
        maxAge: 1000 * 60 * 60 * 2
    };
    
    _.defaults(options, defaults);

    var defaultOpt = {
        auto_reconnect: true,
        ssl: false
    };

    options.options = options.options || {};

    _.defaults(options.options, defaultOpt);

    setInterval(function(){
        self.reap(options.maxAge);
    }, options.reapInterval);

    var server = new mongo.Server(options.host, options.port, options.options);
    new mongo.Db(options.dbName , server, { safe: true }).open(function(err, client) {
        if (err) {
            if (callback) callback(err);
        } else {
            var finish = function(err) {
                self.client = client;
                self.sessions = new mongo.Collection(client, options.collectionName);
                if (callback) callback(err, self);
            };

            if (options.username) {
                client.authenticate(options.username, options.password, finish);
            } else {
                finish();
            }
        }
    });
};

util.inherits(MongoSessionStore, Session.Store);

MongoSessionStore.prototype.reap = function(ms, callback) {
    var thresh = Number(new Date(Number(new Date()) - ms));
    this.sessions.remove({ '$or': [{ "lastAccess" : { "$lt" : thresh }}, { "lastAccess" : { "$exists" : false }}] }, callback || function() {});
};

MongoSessionStore.prototype.set = function(sid, sess, callback) {
    var self = this;
    this.sessions.findOne({ _sessionid: sid }, function(err, session_data) {
        if (err) {
            if (callback) callback(err);
        } else {
            sess._sessionid = sid;
            var method = 'insert';
            if (session_data) {
                sess.lastAccess = (new Date()).getTime();
                method = 'save';
            }
            self.sessions[method](sess, function(err, document) {
                if (err) {
                    if (callback) callback(err);
                } else {
                    if (callback) callback(null, sess);
                }
            });
        }
    });
};

MongoSessionStore.prototype.get = function(sid, callback) {
    this.sessions.findOne({ _sessionid: sid }, function(err, session_data) {
        if (err) {
            if (callback) callback(err);
        } else {
            if (session_data) {
                session_data = cleanSessionData(session_data);
            }
            if (callback) callback(null, session_data);
        }
    });
};

MongoSessionStore.prototype.destroy = function(sid, callback) {
    this.sessions.remove({ _sessionid: sid }, callback || function() {});
};

MongoSessionStore.prototype.length = function(callback) {
    this.sessions.count(callback || function() {});
};

MongoSessionStore.prototype.all = function(callback) {
    var arr = [];
    this.sessions.find(function(err, cursor) {
        cursor.each(function(d) {
            d = cleanSessionData(d);
            arr.push(d);
        });
        if (callback) callback(arr);
    });
};

MongoSessionStore.prototype.clear = function(callback) {
    this.sessions.remove(callback || function() {});
};

module.exports = MongoSessionStore;