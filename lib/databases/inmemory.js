var util = require('util'),
    Session = require('../sessionInterface'),
    _ = require('lodash');

var InMemorySessionStore = function (options) {
  options = options || {};

  Session.MemoryStore.call(this, options);
};

util.inherits(InMemorySessionStore, Session.MemoryStore);

_.extend(InMemorySessionStore.prototype, {

  connect: function (callback) {
    this.emit('connect');
    if (callback) callback(null, this);
  },

  disconnect: function (callback) {
    this.emit('disconnect');
    if (callback) callback(null);
  }

});

module.exports = InMemorySessionStore;
