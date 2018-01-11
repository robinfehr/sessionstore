var util = require('util'),
    Session = require('../sessionInterface'),
    use = require('../use'),
    _ = require('lodash'),
    async = require('async'),
    redis = use('redis'),
    jsondate = require('jsondate');

var RedisSessionStore = function (options) {
  options = options || {};
  Session.Store.call(this, options);

  var defaults = {
    host: 'localhost',
    port: 6379,
    prefix: 'sess',
    ttl:  60 * 60 * 24 * 14, // 14 days
    retry_strategy: function (options) {
      return undefined;
    }//,
    // heartbeat: 60 * 1000
  };

  _.defaults(options, defaults);

  if (options.url) {
    var url = require('url').parse(options.url);
    if (url.protocol === 'redis:') {
      if (url.auth) {
        var userparts = url.auth.split(':');
        options.user = userparts[0];
        if (userparts.length === 2) {
          options.password = userparts[1];
        }
      }
      options.host = url.hostname;
      options.port = url.port;
      if (url.pathname) {
        options.db = url.pathname.replace('/', '', 1);
      }
    }
  }

  this.options = options;
}

util.inherits(RedisSessionStore, Session.Store);

_.extend(RedisSessionStore.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    this.client = new redis.createClient(options.port || options.socket, options.host, _.omit(options, 'prefix'));

    this.prefix = options.prefix;

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

    this.client.on('end', function () {
      self.disconnect();
      self.stopHeartbeat();
    });

    this.client.on('error', function (err) {
      console.log(err);

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

      if (self.options.heartbeat) {
        self.startHeartbeat();
      }

      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, self);
    });
  },

  stopHeartbeat: function () {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      delete this.heartbeatInterval;
    }
  },

  startHeartbeat: function () {
    var self = this;

    var gracePeriod = Math.round(this.options.heartbeat / 2);
    this.heartbeatInterval = setInterval(function () {
      var graceTimer = setTimeout(function () {
        if (self.heartbeatInterval) {
          console.error((new Error ('Heartbeat timeouted after ' + gracePeriod + 'ms (redis)')).stack);
          self.disconnect();
        }
      }, gracePeriod);

      self.client.ping(function (err) {
        if (graceTimer) clearTimeout(graceTimer);
        if (err) {
          console.error(err.stack || err);
          self.disconnect();
        }
      });
    }, this.options.heartbeat);
  },

  disconnect: function (callback) {
    this.stopHeartbeat();

    if (this.client) {
      this.client.end(true);
    }
    this.emit('disconnect');
    if (callback) callback(null, this);
  },

  set: function (sid, sess, callback) {
    var prefixedSid = this.prefix + ':' + sid;

    try {
      var ttl = this.options.ttl;
      if (sess && sess.cookie && sess.cookie.expires) {
        var expInMs = (new Date(sess.cookie.expires)).getTime() - Date.now();
        if (expInMs < 1000) {
          expInMs = 1000;
        }
        ttl = Math.round(expInMs / 1000);
      }
      sess = JSON.stringify(sess);
      this.client.setex(prefixedSid, ttl, sess, callback  || function () {});
    } catch (err) {
      if (callback) callback(err);
    }
  },

  touch: function (sid, sess, callback) {
    var prefixedSid = this.prefix + ':' + sid;
    var ttl = this.options.ttl;
    if (sess && sess.cookie && sess.cookie.expires) {
      var expInMs = (new Date(sess.cookie.expires)).getTime() - Date.now();
      if (expInMs < 1000) {
        expInMs = 1000;
      }
      ttl = Math.round(expInMs / 1000);
    }

    this.client.expire(prefixedSid, ttl, callback  || function () {});
  },

  get: function (sid, callback) {
    var prefixedSid = this.prefix + ':' + sid;

    this.client.get(prefixedSid, function (err, data) {
      if (err) {
        if (callback) callback(err);
        return;
      }
      if (!data) {
        if (callback) callback(null, null);
        return;
      }

      var result;

      try {
        result = jsondate.parse(data.toString());
      } catch (error) {
        if (callback) callback(err);
        return;
      }

      if (callback) callback(null, result);
    });
  },

  destroy: function (sid, callback) {
    var prefixedSid = this.prefix + ':' + sid;
    this.client.del(prefixedSid, callback || function () {});
  },

  all: function (callback) {
    var self = this;
    this.client.keys(this.prefix + ':*', function(err, docs) {
      async.map(docs, function(doc, callback) {
        self.client.get(doc, function (err, data) {
          if (err) {
            if (callback) callback(err);
            return;
          }
          if (!data) {
            if (callback) callback(null, null);
            return;
          }

          var result;

          try {
            result = jsondate.parse(data.toString());
          } catch (error) {
            if (callback) callback(err);
            return;
          }

          if (callback) callback(null, result);
        });
      }, callback);
    });
  },

  length: function (callback) {
    this.client.keys(this.prefix + ':*', function (err, docs) {
      if (err) {
        if (callback) callback(err);
        return;
      }

      if (callback) callback(null, docs.length);
    });
  },

  clear: function (callback) {
    var self = this;
    this.client.keys(this.prefix + ':*', function(err, docs) {
      async.each(docs, function(doc, callback) {
        self.client.del(doc, callback);
      }, callback || function () {});
    });
  }

});

module.exports = RedisSessionStore;
