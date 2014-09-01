'use strict';

var util = require('util'),
    Session = require('../sessionInterface'),
    async = require('async'),
    cradle = require('cradle'),
    _ = require('lodash');

var CouchDbSessionStore = function (options) {
  options = options || {};
  Session.Store.call(this, options);

  var defaults = {
    host: 'http://localhost',
    port: 5984,
    dbName: 'express-sessions',
    collectionName: 'sessions'
  };

  _.defaults(options, defaults);

  var defaultOpt = {
    cache: true,
    raw: false,
    forceSave: true//,
    // secure: true,
    // auth: { username: 'login', password: 'pwd' }
  };

  options.options = options.options || {};

  _.defaults(options.options, defaultOpt);

  this.options = options;

  this.collectionName = options.collectionName;
};

util.inherits(CouchDbSessionStore, Session.Store);

_.extend(CouchDbSessionStore.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    var client = new (cradle.Connection)(options.host, options.port, options.options);
    var db = client.database(options.dbName);
    db.exists(function (err, exists) {

      function finish() {
        self.client = client;
        self.db = db;

        db.get('_design/sessions', function (err, obj) {

          var view = {
            views: {
              findAll: {
                map: function (doc) {
                  emit(doc.collectionName, doc);
                }
              }
            }
          };

          if (err && err.error === 'not_found') {
            db.save('_design/sessions', view, function (err) {
              if (!err) {
                self.emit('connect');
              }
              if (callback) callback(err, self);
            });
            return;
          }
          if (!err) {
            self.emit('connect');
          }
          if (callback) callback(err, self);
        });
      }

      if (err) {
        if (callback) callback(err);
        return;
      }

      if (!exists) {
        db.create(function (err) {
          if (err) {
            if (callback) callback(err);
            return;
          }
          finish();
        });
        return;
      }

      finish();
    });
  },

  disconnect: function(callback) {
    if (!this.client) {
      if (callback) callback(null);
      return;
    }

    // this.client.close();
    this.emit('disconnect');
    if (callback) callback(null);
  },

  set: function (hash, sess, callback) {
    sess.collectionName = this.collectionName;
    this.db.save(hash, sess, callback || function() {});
  },

  get: function (hash, callback) {
    // this.db.get(hash, callback || function() {});
    this.db.get(hash, function(err, res) {
      if (err && err.error === 'not_found') {
        err = null;
      }
      if (callback) callback(err, res);
    });
  },

  destroy: function (hash, callback) {
    var self = this;
    this.db.get(hash, function(err, doc) {
      if (doc) {
        self.db.remove(doc._id, doc._rev, callback || function() {});
      } else {
        if (callback) callback(null);
      }
    });
  },

  all: function (callback) {
    this.db.view('sessions/findAll', { key: this.collectionName }, function (err, docs) {
      var res = [];

      for (var i = 0, len = docs.length; i < len; i++) {
        var obj = docs[i].value;
        obj.id = obj._id;
        var found = _.find(res, function (r) {
          return r.id === obj.id;
        });

        if (!found) {
          res.push(obj);
        }
      }

      if (callback) callback(err, res);
    });
  },

  length: function (callback) {
    this.all(function (err, res) {
      if (callback) callback(null, res.length);
    });
  },

  clear: function (callback) {
    var self = this;
    this.all(function (err, results) {
      async.each(results, function (item, clb) {
        self.db.remove(item._id, item._rev, clb);
      }, function (err) {
        if (callback) callback(err);
      });
    });
  }

});

module.exports = CouchDbSessionStore;
