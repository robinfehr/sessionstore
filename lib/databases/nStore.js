var util = require(process.binding('natives').util ? 'util' : 'sys')
  , Session = require('express').session
  , _ = require('lodash')
  , nStore = require('nstore');

var NStoreSessionStore = function(options, callback) {
    options = options || {};
    Session.Store.call(this, options);

    var defaults = {
        dbFile: __dirname + '/sessions.db',
        maxAge: 3600000
    };
    
    _.defaults(options, defaults);

    this.db = nStore.new(options.dbFile);
    this.db.filterFn = function (doc, meta) {
        return doc.lastAccess > Date.now() - options.maxAge;
    };
};

util.inherits(NStoreSessionStore, Session.Store);

NStoreSessionStore.prototype.set = function (hash, sess, callback) {
    this.db.save(hash, sess, callback);
};

NStoreSessionStore.prototype.get = function (hash, callback) {
  this.db.get(hash, function(err, data, meta){
     if(err instanceof Error) {
        callback();
     }else{
        callback(null, data, meta);
     }
  });
};

NStoreSessionStore.prototype.destroy = function(hash, callback) {
    this.db.remove(hash, callback);
};

NStoreSessionStore.prototype.length = function(callback) {
    process.nextTick(function () {
        callback(this.db.length);
    });
};

NStoreSessionStore.prototype.clear = function(callback) {
    var count = this.db.length;
    Object.keys(this.db.index).forEach(function (key) {
        this.remove(key, function (err) {
            if (err) { callback(err); return; }
            count--;
            if (count === 0) {
                callback();
            }
        });
    }, this.db);
};

module.exports = NStoreSessionStore;