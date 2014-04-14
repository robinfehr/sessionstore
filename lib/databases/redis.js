var util = require(process.binding('natives').util ? 'util' : 'sys'),
    Session = require('../library').getExpressSession(),
    _ = require('lodash'),
    redis = require('redis');

var RedisSessionStore = function (options, callback) {
    options = options || {};
    Session.Store.call(this, options);

    var self = this;

    var defaults = {
        host: 'localhost',
        port: 6379,
        prefix: 'sess',
        ttl: 804600
    };

    _.defaults(options, defaults);

    this.client = new redis.createClient(options.port || options.socket, options.host, options);

    this.prefix = options.prefix;

    this.ttl = options.ttl;

    if (options.db) {
        this.client.select(options.db);
        this.client.on("connect", function () {
            self.client.send_anyways = true;
            self.client.select(options.db);
            self.client.send_anyways = false;
        });
    }

    var calledBack = false;

    this.client.on('error', function () {
        self.emit('disconnect');

        if (calledBack) return;
        calledBack = true;
        if (callback) callback(null, self);
    });

    this.client.on('connect', function () {
        self.emit('connect');

        if (calledBack) return;
        calledBack = true;
        if (callback) callback(null, self);
    });

};

util.inherits(RedisSessionStore, Session.Store);

RedisSessionStore.prototype.set = function (sid, sess, callback) {
    var prefixedSid = this.prefix + sid;

    try {
        var ttl = this.ttl;
        sess = JSON.stringify(sess);

        this.client.setex(prefixedSid, ttl, sess, function (err, result) {
            if (callback) {
                callback(err, result);
            }
        });
    } catch (err) {
        if (callback) {
            callback(err);
        }
    }
};

RedisSessionStore.prototype.get = function (sid, callback) {
    var prefixedSid = this.prefix + sid;

    this.client.get(prefixedSid, function (err, data) {
        if (err) {
            if (callback) {
                callback(err);
            }
            return;
        }
        if (!data) {
            if (callback) {
                callback(null, null);
            }
            return;
        }

        var result;

        try {
            result = JSON.parse(data.toString());
        } catch (error) {
            if (callback) {
                callback(error);
            }
            return;
        }

        if (callback) {
            callback(null, result);
        }
    });
};

RedisSessionStore.prototype.destroy = function (sid, callback) {
    var prefixedSid = this.prefix + sid;
    this.client.del(prefixedSid, callback);
};

module.exports = RedisSessionStore;