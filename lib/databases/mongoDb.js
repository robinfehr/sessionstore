//     lib/databases/mongoDb.js v0.0.1
//     (c) 2012 Adriano Raiano (adrai); under MIT License

var util = require(process.binding('natives').util ? 'util' : 'sys')
  , Session = require('express').session
  , mongo = require('mongodb')
  , ObjectID = mongo.BSONPure.ObjectID
  , _ = require('underscore');

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

    // Default reapInterval to 10 minutes
    var reapInterval = options.reapInterval || 600000;

    if (reapInterval !== -1) {
        setInterval(function(self){
            self.reap(self.maxAge);
        }, reapInterval, this);
    }

    var defaults = {
        host: 'localhost',
        port: 27017,
        dbName: 'express-sessions',
        collectionName: 'sessions'
    };
    
    _.defaults(options, defaults);

    var self = this;
    var server = new mongo.Server(options.host, options.port, { auto_reconnect: true });
    new mongo.Db(options.dbName , server, {}).open(function(err, client) {
        if (err) {
            if (callback) callback(err);
        } else {
            var finish = function() {
                self.client = client;
                self.sessions = new mongo.Collection(client, options.collectionName);
                if (callback) callback(null, self);
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
    this.sessions.remove({ "lastAccess" : { "$lt" : thresh }}, callback || function() {});
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
    this.sessions.remove({ _sessionid: sid }, callback);
};

MongoSessionStore.prototype.length = function(callback) {
    this.sessions.count(callback);
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
    this.sessions.remove(function(err) {
        if (callback) callback(err);
    });
};

module.exports = MongoSessionStore;