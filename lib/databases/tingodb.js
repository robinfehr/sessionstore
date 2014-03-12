var util = require(process.binding('natives').util ? 'util' : 'sys')
  , Session = require('express').session
  , tingodb = require('tingodb')()
  , ObjectID = tingodb.ObjectID
  , _ = require('lodash');

function cleanSessionData(json) {
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

var TingoSessionStore = function(options, callback) {
    options = options || {};
    Session.Store.call(this, options);

    var self = this;

    var defaults = {
        dbPath: __dirname + '/',
        collectionName: 'sessions',
        reapInterval: 600000,
        maxAge: 1000 * 60 * 60 * 2
    };
    
    _.defaults(options, defaults);

    setInterval(function(){
        self.reap(options.maxAge);
    }, options.reapInterval);

    this.dbPath = options.dbPath;

    this.db = new tingodb.Db(this.dbPath, {});
    this.sessions = this.db.collection(options.collectionName + '.tingo');

    if (callback) callback(null, this);
};

util.inherits(TingoSessionStore, Session.Store);

TingoSessionStore.prototype.reap = function(ms, callback) {
    var thresh = Number(new Date(Number(new Date()) - ms));
    this.sessions.remove({ '$or': [{ "lastAccess" : { "$lt" : thresh }}, { "lastAccess" : { "$exists" : false }}] }, callback || function() {});
};

TingoSessionStore.prototype.set = function(sid, sess, callback) {
    var self = this;
    this.sessions.findOne({ _sessionid: sid }, function(err, session_data) {
        if (err) {
            if (callback) callback(err);
        } else {
            sess._sessionid = sid;
            var method = 'insert';
            if (session_data) {
                sess.lastAccess = (new Date()).getTime();
                method = 'save';
            }
            self.sessions[method](sess, function(err, document) {
                if (err) {
                    if (callback) callback(err);
                } else {
                    if (callback) callback(null, sess);
                }
            });
        }
    });
};

TingoSessionStore.prototype.get = function(sid, callback) {
    this.sessions.findOne({ _sessionid: sid }, function(err, session_data) {
        if (err) {
            if (callback) callback(err);
        } else {
            if (session_data) {
                session_data = cleanSessionData(session_data);
            }
            if (callback) callback(null, session_data);
        }
    });
};

TingoSessionStore.prototype.destroy = function(sid, callback) {
    this.sessions.remove({ _sessionid: sid }, callback);
};

TingoSessionStore.prototype.length = function(callback) {
    this.sessions.count(callback);
};

TingoSessionStore.prototype.all = function(callback) {
    var arr = [];
    this.sessions.find(function(err, cursor) {
        cursor.each(function(d) {
            d = cleanSessionData(d);
            arr.push(d);
        });
        if (callback) callback(arr);
    });
};

TingoSessionStore.prototype.clear = function(callback) {
    this.sessions.remove(function(err) {
        if (callback) callback(err);
    });
};

module.exports = TingoSessionStore;