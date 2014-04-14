var util = require(process.binding('natives').util ? 'util' : 'sys'),
    Session = require('../library').getExpressSession(),
    _ = require('lodash'),
    memjs = require('memjs');

var MemcachedSessionStore = function (options, callback) {
    options = options || {};
    Session.Store.call(this, options);

    var self = this;

    var defaults = {
        host: 'localhost',
        port: 11211,
        prefix: 'sess',
        expires: 80,
        retries: 2,
        failover: false,
        failoverTime: 60,
    };

    _.defaults(options, defaults);

    if (!options.servers) {
        if (options.username) {
            options.servers = options.username + ':' + options.password + '@' + options.host + ':' + options.port;
        } else {
            options.servers = options.host + ':' + options.port;
        }
    }

    this.client = memjs.Client.create(options.servers, options);

    this.prefix = options.prefix;

    if (callback) callback(null, this);

};

util.inherits(MemcachedSessionStore, Session.Store);

MemcachedSessionStore.prototype.set = function (sid, sess, callback) {
    var prefixedSid = this.prefix + sid;

    var sessString;
    try {
        sessString = JSON.stringify(sess);
    } catch (err) {
        if (callback) callback(err);
        return;
    }

    this.client.set(prefixedSid, sessString, function (err, res) {
        if (callback) callback(err, res);
    });
};

MemcachedSessionStore.prototype.get = function (sid, callback) {
    var prefixedSid = this.prefix + sid;

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
            result = JSON.parse(value);
        } catch (error) {
            if (callback) callback(error);
            return;
        }

        if (callback) callback(null, result);
    });
};

MemcachedSessionStore.prototype.destroy = function (sid, callback) {
    var prefixedSid = this.prefix + sid;

    this.client.delete(prefixedSid, function (err, res) {
        if (callback) callback(err, res);
    });
};

module.exports = MemcachedSessionStore;