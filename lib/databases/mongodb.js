var util = require('util'),
    Session = require('../sessionInterface'),
    use = require('../use'),
    mongo = use('mongodb'),
    mongoVersion = use('mongodb/package.json').version,
    isNew = mongoVersion.indexOf('1.') !== 0,
    ObjectID = isNew ? mongo.ObjectID : mongo.BSONPure.ObjectID,
    _ = require('lodash');

function cleanSessionData(json) {
  if (!json) {
    return json;
  }

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

var MongoSessionStore = function (options) {
  options = options || {};

  Session.Store.call(this, options);

  var defaults = {
    host: 'localhost',
    port: 27017,
    dbName: 'express-sessions',
    collectionName: 'sessions',
    // heartbeat: 60 * 1000,
    ttl:  60 * 60 * 24 * 14 // 14 days
  };

  _.defaults(options, defaults);

  var defaultOpt = {
    ssl: false
  };

  options.options = options.options || {};

  if (isNew) {
    defaultOpt.autoReconnect = false;
    _.defaults(options.options, defaultOpt);
  } else {
    defaultOpt.auto_reconnect = false;
    _.defaults(options.options, defaultOpt);
  }

  this.options = options;
};

util.inherits(MongoSessionStore, Session.Store);

_.extend(MongoSessionStore.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    var connectionUrl;

    if (options.url) {
      connectionUrl = options.url;
    } else {
      var members = options.servers
        ? options.servers
        : [{host: options.host, port: options.port}];

      var memberString = _(members).map(function(m) { return m.host + ':' + m.port; });
      var authString = options.username && options.password
        ? options.username + ':' + options.password + '@'
        : '';
      var optionsString = options.authSource
        ? '?authSource=' + options.authSource
        : '';

      connectionUrl = 'mongodb://' + authString + memberString + '/' + options.dbName + optionsString;
    }

    var client;

    if (mongo.MongoClient.length === 2) {
      client = new mongo.MongoClient(connectionUrl, options.options);
      client.connect(function(err, cl) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }

        self.db = cl.db(cl.s.options.dbName);
        if (!self.db.close) {
          self.db.close = cl.close.bind(cl);
        }
        initDb();
      });
    } else {
      client = new mongo.MongoClient();
      client.connect(connectionUrl, options.options, function(err, db) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }

        self.db = db;
        initDb();
      });
    }

    function initDb() {
      self.db.on('close', function() {
        self.isConnected = false;
        self.emit('disconnect');
        self.stopHeartbeat();
      });

      var finish = function (err) {
        self.sessions = self.db.collection(options.collectionName);
        self.sessions.ensureIndex({ expires: 1 }, { expireAfterSeconds: 0 }, function() {});
        if (!err) {
          self.isConnected = true;
          self.emit('connect');

          if (self.options.heartbeat) {
            self.startHeartbeat();
          }
        }
        if (callback) callback(err, self);
      };

      finish();
    }
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
          console.error((new Error ('Heartbeat timeouted after ' + gracePeriod + 'ms (mongodb)')).stack);
          self.disconnect();
        }
      }, gracePeriod);

      self.db.command({ ping: 1 }, function (err) {
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

    if (!this.db || !this.isConnected) {
      if (callback) callback(null);
      return;
    }

    this.db.close(function (err) {
      if (callback) callback(err);
    });
  },

  set: function (sid, sess, callback) {
    if (sess && sess.cookie && sess.cookie.expires) {
      sess.expires = new Date(sess.cookie.expires);
    } else {
      // If there's no expiration date specified, it is
      // browser-session cookie or there is no cookie at all,
      // as per the connect docs.
      //
      // So we set the expiration to two-weeks from now
      // - as is common practice in the industry (e.g Django) -
      // or the default specified in the options.
      sess.expires = new Date(Date.now() + this.options.ttl * 1000);
    }

    sess._id = sid;

    var query = {
      _id: sid
    };

    if (sess._hash) {
      query._hash = sess._hash;
    }

    sess._hash = new ObjectID().toString();

    this.sessions.update(query, sess, { upsert: true, safe: true }, function(err, modifiedCount) {
      if (modifiedCount && modifiedCount.result && modifiedCount.result.n === 0) {
        return callback(new Error('ConcurrencyError: Session was updated by someone else!'));
      }
      if (err) {
        if (callback) callback(err);
        return;
      }
      if (callback) callback(null, sess);
    });
  },

  //touch: function (sid, sess, callback) {
  //  this.set(sid, sess, callback);
  //},

  get: function (sid, callback) {
    this.sessions.findOne({
      _id: sid,
      $or: [
        { expires: { $exists: false } },
        { expires: { $gt: new Date() } }
      ]
    }, function (err, session_data) {
      if (err) {
        if (callback) callback(err);
        return;
      }
      session_data = cleanSessionData(session_data);
      if (callback) callback(null, session_data);
    });
  },

  destroy: function (sid, callback) {
    this.sessions.remove({ _id: sid }, callback || function () {});
  },

  length: function (callback) {
    this.sessions.count(callback || function () {});
  },

  all: function (callback) {
    var arr = [];
    this.sessions.find(function (err, cursor) {
      cursor.each(function (err, d) {
        d = cleanSessionData(d);
        arr.push(d);
        if (!d._id) {
          if (callback) callback(null, arr);
        }
      });
    });
  },

  clear: function (callback) {
    this.sessions.remove(callback || function () {});
  }

});

module.exports = MongoSessionStore;
