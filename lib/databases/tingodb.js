var util = require('util'),
    Session = require('../sessionInterface'),
    use = require('../use'),
    tingodb = use('tingodb')(),
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
    ttl:  60 * 60 * 24 * 14 // 14 days
  };

  _.defaults(options, defaults);

  this.options = options;
};

util.inherits(TingoSessionStore, Session.Store);

_.extend(TingoSessionStore.prototype, {

  connect: function (callback) {
    var options = this.options;

    this.db = new tingodb.Db(options.dbPath, {});
    // this.db.on('close', function() {
    //   self.emit('disconnect');
    // });
    this.sessions = this.db.collection(options.collectionName + '.tingo');
    this.sessions.ensureIndex({ expires: 1 }, { expireAfterSeconds: 0 }, function() {});

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

  set: function (sid, sess, callback) {
    if (sess && sess.cookie && sess.cookie.expires) {
      sess.expires = new Date(sess.cookie.expires);
    } else {
      // If there's no expiration date specified, it is
      // browser-session cookie or there is no cookie at all,
      // as per the connect docs.
      //
      // So we set the expiration to two-weeks from now
      // - as is common practice in the industry (e.g Django) -
      // or the default specified in the options.
      sess.expires = new Date(Date.now() + this.options.ttl * 1000);
    }

    sess._id = sid;

    this.sessions.update({_id: sid}, sess, { upsert: true, safe: true }, function(err) {
      if (err) {
        if (callback) callback(err);
        return;
      }
      if (callback) callback(null, sess);
    });
  },

  //touch: function (sid, sess, callback) {
  //  this.set(sid, sess, callback);
  //},

  get: function (sid, callback) {
    this.sessions.findOne({
      _id: sid,
      $or: [
        { expires: { $exists: false } },
        { expires: { $gt: new Date() } }
      ]
    }, function (err, session_data) {
      if (err) {
        if (callback) callback(err);
        return;
      }
      session_data = cleanSessionData(session_data);
      if (callback) callback(null, session_data);
    });
  },

  destroy: function (sid, callback) {
    this.sessions.remove({ _id: sid }, callback || function () {});
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
