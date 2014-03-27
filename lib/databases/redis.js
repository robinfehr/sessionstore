var util = require(process.binding('natives').util ? 'util' : 'sys'),
      express = require('express'),
      Session = express.session,
      _ = require('lodash'),
      redis = require('redis');

var RedisSessionStore = function(options, callback) {
    options = options || {};
    Session.Store.call(this, options);

    var self = this;

    var defaults = {
        host: 'localhost',
        port: 6379,
        prefix:'sess',
        ttl: 804600,
        reapInterval: 600000
    };

    _.defaults(options, defaults);

    this.client = new redis.createClient(options.port || options.socket, options.host, options);

    this.ttl = options.ttl;

    if (options.db) {
        self.client.select(options.db);
        self.client.on("connect", function() {
            self.client.send_anyways = true;
            self.client.select(options.db);
            self.client.send_anyways = false;
        });
    }

    var calledBack = false;

    self.client.on('error', function () {
        self.emit('disconnect');

        if (calledBack) return;
        calledBack = true;
        if (callback) callback(null, self);
    });

    self.client.on('connect', function () {
        self.emit('connect');

        if (calledBack) return;
        calledBack = true;
        if (callback) callback(null, self);
    });
    
};

util.inherits(RedisSessionStore, Session.Store);

RedisSessionStore.prototype.set = function (sid, sess, callback) {
    sid = this.prefix + sid;

    try {
        var ttl = this.ttl;
        sess = JSON.stringify(sess);

        this.client.setex(sid, ttl, sess, function(err, result){
            if(callback){
                callback(err, result);
            }
        });
    } catch (err) {
        if(callback){
            callback(err);
        }
    }
};

RedisSessionStore.prototype.get = function (sid, callback) {
    sid = this.prefix + sid;

    this.client.get(sid, function(err, data){
        if (err) {
            if(callback){
                callback(err);
            }
            return;
        }
        if (!data){
            if(callback){
                callback(null, null);
            }
            return;
        }

        var result;

        try {
            result = JSON.parse(data.toString());
        } catch (error) {
            if(callback){
                callback(error);
            }
            return;
        }

        if(callback){
            callback(null, result);
        }
    });
};

RedisSessionStore.prototype.destroy = function(sid, callback){
    sid = this.prefix + sid;
    this.client.del(sid, callback);
};

// RedisSessionStore.prototype.destroy = function(hash, callback) {
//    this.db.remove(hash, callback);
// };

// RedisSessionStore.prototype.length = function(callback) {
//    process.nextTick(function () {
//        callback(this.db.length);
//    });
// };

// RedisSessionStore.prototype.clear = function(callback) {
//    var count = this.db.length;
//    Object.keys(this.db.index).forEach(function (key) {
//        this.remove(key, function (err) {
//            if (err) { callback(err); return; }
//            count--;
//            if (count === 0) {
//                callback();
//            }
//        });
//    }, this.db);
// };

module.exports = RedisSessionStore;