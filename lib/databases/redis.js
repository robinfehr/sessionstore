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

    if (options.url) {
      var url = require('url').parse(options.url);
      if (url.protocol === 'redis:') {
        if (url.auth) {
          var userparts = url.auth.split(":");
          options.user = userparts[0];
          if (userparts.length === 2) {
            options.password = userparts[1];
          }
        }
        options.host = url.hostname;
        options.port = url.port;
        if (url.pathname) {
          options.db   = url.pathname.replace("/", "", 1);
        }
      }
    }

    this.client = new redis.createClient(options.port || options.socket, options.host, options);

    this.prefix = options.prefix;

    this.ttl = options.ttl;

    var calledBack = false;

    if (options.password) {
      this.client.auth(options.password, function(err) {
        if (err && !calledBack && callback) {
            calledBack = true;
            if (callback) callback(err, self);
            return;
        }
        if (err) throw err;
      });
    }

    if (options.db) {
        this.client.select(options.db);
    }

    this.client.on('error', function () {
        self.emit('disconnect');

        if (calledBack) return;
        calledBack = true;
        if (callback) callback(null, self);
    });

    this.client.on('connect', function () {
        if (options.db) {
            self.client.send_anyways = true;
            self.client.select(options.db);
            self.client.send_anyways = false;
        }
        
        self.emit('connect');

        if (calledBack) return;
        calledBack = true;
        if (callback) callback(null, self);
    });
};

util.inherits(RedisSessionStore, Session.Store);

RedisSessionStore.prototype.set = function (sid, sess, callback) {
    var prefixedSid = this.prefix + ':' + sid;

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
    var prefixedSid = this.prefix + ':' + sid;

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
    var prefixedSid = this.prefix + ':' + sid;
    this.client.del(prefixedSid, callback);
};

RedisSessionStore.prototype.all = function (callback) {
    this.client.keys(this.prefix + ':*', callback);
};

RedisSessionStore.prototype.length = function (callback) {
    this.client.keys(this.prefix + ':*', function (err, docs) {
        if (err) {
            return callback && callback(err);
        }

        if (callback) callback(null, docs.length);
    });
};

RedisSessionStore.prototype.clear = function (callback) {
    this.client.del(this.prefix + ':*', callback);
};

module.exports = RedisSessionStore;