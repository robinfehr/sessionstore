'use strict';

var util = require('util'),
    Session = require('../sessionInterface'),
    mongo = require('mongodb'),
    mongoVersion = require('mongodb/package.json').version,
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
    ttl:  60 * 60 * 24 * 14 // 14 days
  };

  _.defaults(options, defaults);

  var defaultOpt = {
    auto_reconnect: false,
    ssl: false
  };

  options.options = options.options || {};

  _.defaults(options.options, defaultOpt);

  this.options = options;
};

util.inherits(MongoSessionStore, Session.Store);

_.extend(MongoSessionStore.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    var server;

    if (options.servers && Array.isArray(options.servers)){
      var servers = [];

      options.servers.forEach(function(item){
        if(item.host && item.port) {
          servers.push(new mongo.Server(item.host, item.port, item.options));
        }
      });

      server = new mongo.ReplSet(servers);
    } else {
      server = new mongo.Server(options.host, options.port, options.options);
    }

    this.db = new mongo.Db(options.dbName, server, { safe: true });
    this.db.on('close', function() {
      self.isConnected = false;
      self.emit('disconnect');
    });

    this.isConnected = false;

    this.db.open(function (err, client) {
      if (err) {
        if (callback) callback(err);
      } else {
        var finish = function (err) {
          self.client = client;
          self.sessions = self.db.collection(options.collectionName);
          self.sessions.ensureIndex({ expires: 1 }, { expireAfterSeconds: 0 }, function() {});
          if (!err) {
            self.isConnected = true;
            self.emit('connect');
          }
          if (callback) callback(err, self);
        };

        if (options.username) {
          client.authenticate(options.username, options.password, finish);
        } else {
          finish();
        }
      }
    });
  },

  disconnect: function (callback) {
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

    this.sessions.update({_id: sid}, sess, { upsert: true, safe: true }, function(err) {
      if (err) {
        if (callback) callback(err);
        return;
      }
      if (callback) callback(null, sess);
    });
  },

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
