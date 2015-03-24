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
    reapInterval: 600000,
    maxAge: 1000 * 60 * 60 * 2
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

    setInterval(function () {
      self.reap(options.maxAge);
    }, options.reapInterval);

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
      self.emit('disconnect');
    });

    this.db.open(function (err, client) {
      if (err) {
        if (callback) callback(err);
      } else {
        var finish = function (err) {
          self.client = client;
          self.sessions = self.db.collection(options.collectionName);
          self.sessions.ensureIndex({ '_sessionid': 1 }, function() {});
          if (!err) {
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
    if (!this.db) {
      if (callback) callback(null);
      return;
    }

    this.db.close(callback || function () {});
  },

  reap: function (ms, callback) {
    var thresh = Number(new Date(Number(new Date()) - ms));
    this.sessions.remove(
      {
        '$or': [
          { "lastAccess": { "$lt": thresh }},
          { "lastAccess": { "$exists": false }}
        ]
      }, callback || function () {});
  },

  set: function (sid, sess, callback) {
    var self = this;

    this.sessions.findOne({ _sessionid: sid }, function (err, session_data) {
      if (err) {
        if (callback) callback(err);
      } else {
        sess._sessionid = sid;
        var method = 'insert';
        if (session_data) {
          sess._id = session_data._id;
          sess.lastAccess = (new Date()).getTime();
          method = 'save';
        }
        self.sessions[method](sess, function (err, document) {
          if (err) {
            if (callback) callback(err);
            return;
          }
          if (callback) callback(null, sess);
        });
      }
    });
  },

  get: function (sid, callback) {
    this.sessions.findOne({ _sessionid: sid }, function (err, session_data) {
      if (err) {
        if (callback) callback(err);
        return;
      }
      session_data = cleanSessionData(session_data);
      if (callback) callback(null, session_data);
    });
  },

  destroy: function (sid, callback) {
    this.sessions.remove({ _sessionid: sid }, callback || function () {});
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
