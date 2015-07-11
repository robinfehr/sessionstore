'use strict';

var util = require('util'),
    Session = require('../sessionInterface'),
    _ = require('lodash'),
    async = require('async'),
    elasticsearch = require('elasticsearch');

var ElasticSearchSessionStore = function (options) {
  options = options || {};
  Session.Store.call(this, options);

  var defaults = {
    index: 'express',
    typeName: 'session',
    prefix: '',
    ttl: 60 * 60 * 24 * 14, // 14 days
    pingInterval: 1000
  };

  _.defaults(options, defaults);

  if (!options.hosts && !options.host) {
    options.host = 'localhost:9200';
  }

  this.options = options;

  this.index = this.options.index;
  this.typeName = this.options.typeName;
};

util.inherits(ElasticSearchSessionStore, Session.Store);

_.extend(ElasticSearchSessionStore.prototype, {

  connect: function (callback) {
    var self = this;

    this.isConnected = false;

    this.client = new elasticsearch.Client(this.options);

    var callbacked = false;
    this.closeCalled = false;

    var interval = setInterval(function () {
      self.client.ping(function (err) {
        if (err) {
          if (self.isConnected) {
            self.isConnected = false;
            self.emit('disconnect');
          }
          if (callback && !callbacked) {
            callbacked = true;
            callback(err, self);
          }
          return;
        }

        if (!self.isConnected) {
          if (!callbacked) {
            self.client.indices.create({
              index: self.index,
              type: self.typeName
            }, function(err) {
              if (err && err.message.toLowerCase().indexOf('already') >= 0) {
                err = null;
              }
              if (err) {
                if (callback) {
                  callbacked = true;
                  callback(err, self);
                }
                return;
              }

              self.client.indices.putMapping({
                index: self.index,
                type: self.typeName,
                body: {
                  session: {
                    _ttl: { enabled: true, default: '14d' }
                  }
                }
              }, function(err) {
                if (err) {
                  if (callback) {
                    callbacked = true;
                    callback(err, self);
                  }
                  return;
                }

                self.isConnected = true;
                self.emit('connect');
                if (callback) {
                  callbacked = true;
                  callback(err, self);
                }
              });
            });
          }
        }

        if (self.closeCalled) {
          clearInterval(interval);
        }
      });
    }, this.options.pingInterval);
  },

  disconnect: function (callback) {
    this.closeCalled = true;
    if (this.client) this.client.close();
    if (callback) callback(null);
  },

  set: function (sid, sess, callback) {
    var ttl = this.options.ttl * 1000;
    if (sess && sess.cookie && sess.cookie.expires) {
      ttl = (new Date(sess.cookie.expires)).getTime() - Date.now();
      sess.expiresAt = new Date(sess.cookie.expires);
    } else {
      sess.expiresAt = new Date(Date.now() + this.options.ttl * 1000);
    }

    this.client.index({
      index: this.index,
      type: this.typeName,
      id: this.options.prefix + sid,
      ttl: ttl,
      body: sess
    }, callback || function () {});
  },

  get: function (sid, callback) {
    this.client.get({
      index: this.index,
      type: this.typeName,
      id: this.options.prefix + sid
    }, function (err, res) {
      if (err && err.message.toLowerCase().indexOf('not found') >= 0) {
        err = null;
      }
      if (err) return callback(err);
      if (typeof res == 'undefined') return callback(null, null);
      if (res._source && res._source.expiresAt && (new Date(res._source.expiresAt)).getTime() > Date.now()) {
        delete res._source.expiresAt;
        return callback(null, res._source);
      }
      callback(null, null);
    });
  },

  destroy: function (sid, callback) {
    this.client.delete({
      index: this.index,
      type: this.typeName,
      id: this.options.prefix + sid
    }, function (err, res) {
      if (err && err.message.toLowerCase().indexOf('not found') >= 0) {
        err = null;
      }
      if (callback) callback(err);
    });
  },

  clear: function (callback) {
    this.client.deleteByQuery({
      index: this.index,
      type: this.typeName,
      body: {
        query: {
          bool: {
            must: [
              {
                match_all: {}
              }
            ]
          }
        }
      }
    }, callback || function () {});
  }

});

module.exports = ElasticSearchSessionStore;
