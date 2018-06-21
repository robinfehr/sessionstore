var util = require('util'),
    Session = require('../sessionInterface'),
    use = require('../use'),
    _ = require('lodash'),
    async = require('async'),
    jsondate = require('jsondate'),
    elasticsearch = use('elasticsearch');

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
      if (self.closeCalled) {
        clearInterval(interval);
      }

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
          // Github issue #39 - recover after temp ping error.
          if (callbacked) {
            // Already callbacked, so only restore isConnected state.
            self.isConnected = true;
            self.emit('connect');
          } else {
            // Not callbacked yet, so perform init logic and handle isConnected state.
            self.client.indices.create({
              index: self.index,
              type: self.typeName
            }, function(err) {
              if (err && err.message.toLowerCase().indexOf('already') >= 0) {
                err = null;
              }
              if (err) {
                if (callback && !callbacked) {
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
                  if (callback && !callbacked) {
                    callbacked = true;
                    callback(err, self);
                  }
                  return;
                }

                self.isConnected = true;
                self.emit('connect');
                if (callback && !callbacked) {
                  callbacked = true;
                  callback(err, self);
                }
              });
            });
          }
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

    // sess._version = sess._version || 1;
    // sess._version++;

    var self = this;

    this.client.exists({
      index: this.index,
      type: this.typeName,
      id: this.options.prefix + sid
    }, function (err, exists) {
      var methodName = undefined;
      if (!exists) {
        methodName = 'create';
      }
      self.client.index({
        index: self.index,
        type: self.typeName,
        id: self.options.prefix + sid,
        opType: methodName,
        // version: sess._version > 2 ? sess._version - 1 : undefined,
        //ttl: ttl + 'ms',
        body: sess,
        refresh: true
      }, function (err, res) {
        if (err && (err.message.toLowerCase().indexOf('version') >= 0)) {
          return callback(new Error('ConcurrencyError: Session was updated by someone else!'));
        }
        callback(err, res);
      });
    });
  },

  //touch: function (sid, sess, callback) {
  //  this.set(sid, sess, callback);
  //},

  get: function (sid, callback) {
    this.client.get({
      index: this.index,
      type: this.typeName,
      id: this.options.prefix + sid
    }, function (err, res) {
      if (err && (err.message.toLowerCase().indexOf('not found') >= 0 || err.message.toLowerCase().indexOf('no such index') >= 0)) {
        err = null;
      }
      if (err) return callback(err);
      if (typeof res == 'undefined') return callback(null, null);
      if (res._source) {
        var sess = jsondate.parse(JSON.stringify(res._source));
        if (sess.expiresAt && sess.expiresAt.getTime() > Date.now()) {
          delete sess.expiresAt;
          return callback(null, sess);
        }
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
    var self = this;
    this.client.indices.exists({index: this.index}, function (err, result) {
      if (result){
        self.client.indices.delete({index: self.index}, function (err) {
          if (callback) callback(err);
        });
      } else {
        if (callback) callback(err);
      }
    });
  }

});

module.exports = ElasticSearchSessionStore;
