'use strict';

var util = require('util'),
    Session = require('../sessionInterface'),
    tingodb = require('tingodb')(),
    ObjectID = tingodb.ObjectID,
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

var TingoSessionStore = function (options) {
  options = options || {};

  Session.Store.call(this, options);

  var defaults = {
    dbPath: require('path').join(__dirname, '../../'),
    collectionName: 'sessions',
    reapInterval: 600000,
    maxAge: 1000 * 60 * 60 * 2
  };

  _.defaults(options, defaults);

  this.options = options;
};

util.inherits(TingoSessionStore, Session.Store);

_.extend(TingoSessionStore.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    setInterval(function () {
      self.reap(options.maxAge);
    }, options.reapInterval);

    this.db = new tingodb.Db(options.dbPath, {});
    // this.db.on('close', function() {
    //   self.emit('disconnect');
    // });
    this.sessions = this.db.collection(options.collectionName + '.tingo');

    this.emit('connect');
    if (callback) callback(null, this);
  },

  disconnect: function (callback) {
    if (!this.db) {
      if (callback) callback(null);
      return;
    }

    this.emit('disconnect');
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

module.exports = TingoSessionStore;
