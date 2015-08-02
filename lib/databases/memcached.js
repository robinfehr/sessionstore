'use strict';

var util = require('util'),
    Session = require('../sessionInterface'),
    use = require('../use'),
    _ = require('lodash'),
    memjs = use('memjs'),
    jsondate = require('jsondate');

var MemcachedSessionStore = function (options) {
  options = options || {};
  Session.Store.call(this, options);

  var defaults = {
    host: 'localhost',
    port: 11211,
    prefix: 'sess',
    expires: 80,
    retries: 2,
    failover: false,
    failoverTime: 60
  };

  _.defaults(options, defaults);

  if (!options.servers) {
    if (options.username) {
      options.servers = options.username + ':' + options.password + '@' + options.host + ':' + options.port;
    } else {
      options.servers = options.host + ':' + options.port;
    }
  }

  this.options = options;
};

util.inherits(MemcachedSessionStore, Session.Store);

_.extend(MemcachedSessionStore.prototype, {

  connect: function (callback) {
    var options = this.options;

    this.client = memjs.Client.create(options.servers, options);

    this.prefix = options.prefix;

    this.emit('connect');
    if (callback) callback(null, this);
  },

  disconnect: function (callback) {
    this.client.close();
    this.emit('disconnect');
    if (callback) callback(null, this);
  },

  set: function (sid, sess, callback) {
    var prefixedSid = this.prefix + ':' + sid;

    var sessString;
    try {
      sessString = JSON.stringify(sess);
    } catch (err) {
      if (callback) callback(err);
      return;
    }

    var ttl = this.options.expires;
    if (sess && sess.cookie && sess.cookie.expires) {
      var expInMs = (new Date(sess.cookie.expires)).getTime() - Date.now();
      if (expInMs < 1000) {
        expInMs = 1000;
      }
      ttl = Math.round(expInMs / 1000);
    }

    this.client.set(prefixedSid, sessString, callback || function () {}, ttl);
  },

  //touch: function (sid, sess, callback) {
  //  this.set(sid, sess, callback);
  //},

  get: function (sid, callback) {
    var prefixedSid = this.prefix + ':' + sid;

    this.client.get(prefixedSid, function (err, value, key) {
      if (err) {
        if (callback) callback(err);
        return;
      }

      if (!value) {
        if (callback) callback(null, null);
        return;
      }

      var result;

      try {
        result = jsondate.parse(value.toString());
      } catch (error) {
        if (callback) callback(error);
        return;
      }

      if (callback) callback(null, result);
    });
  },

  destroy: function (sid, callback) {
    var prefixedSid = this.prefix + ':' + sid;

    this.client.delete(prefixedSid, callback || function() {});
  },

  clear: function (callback) {
    this.client.flush(callback || function() {});
  }

});

module.exports = MemcachedSessionStore;
