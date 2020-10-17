var util = require('util'),
    Session = require('../sessionInterface'),
    use = require('../use'),
    _ = require('lodash'),
    { Client } = use('@elastic/elasticsearch');


var ElasticSearchSessionStore = function (options) {
  options = options || {};
  Session.Store.call(this, options);

  var defaults = {
    index: 'express-session', // default name changed to prevent conflicts with prev versions
    typeName: 'session',
    prefix: '',
    ttl: 60 * 60 * 24 * 14, // 14 days
    pingInterval: 1000
  };

  _.defaults(options, defaults);

  if (!options.nodes && !options.node) {
    options.node = 'localhost:9200';
  }

  this.options = options;

  this.index = this.options.index;
  this.typeName = this.options.typeName;
};

function init(client, index, typeName){
  return new Promise(async (resolve, reject) =>{
    try{
      // check if template exists
      let exists = await client.indices.existsTemplate({
        name: `${index}-*`
      })
      if(exists.body === false){
        // create the template
        let options = {
          name: `${index}-*`,
          include_type_name: true,
          order: 0,
          create: true,
          body: {
            "index_patterns": `${index}-*`,
            "mappings": {
              [typeName]: {
                "properties": {
                  "expiry": {
                    "type": "date",
                    //"format": "yyyy-MM-dd'T'HHmmssZ"
                  }
                }
              }
            },
            "aliases": {
              [index]: {}
            }
          }
        }
        await client.indices.putTemplate(options);
      }
      resolve()
    }catch(err){
      reject(err)
    }
  })
}
function getIndices(client, index){
  return new Promise(async (resolve, reject)=>{
    let indices = []
    let response = await client.cat.indices({
      index: `${index}*`
    });
    let lines = response.body.split('\n');
    lines.forEach(line=>{
      let parts = line.split(/\s+/g);
      if(parts[2] && isValidIndexName(parts[2])){
        indices.push(parts[2]);
      }
    })
    resolve(indices);
  })
}
function isValidIndexName(index){
  let matches = index.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})$/i) || [];
  if(matches.length !== 4){
    return false;
  }
  let year = Number(matches[1]);
  let month = Number(matches[2]);
  let day = Number(matches[3]);
  if(isNaN(year) || isNaN(month) || isNaN(day) ){
    return false;
  }
  return true;
}


async function clearOldIndices(client, index){
  try{
    let indices = await getIndices(client, index)
    indices.forEach(index=>{
      let matches = index.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})$/) || [];
      if(matches.length !== 4){
        return;
      }
      let year = Number(matches[1]);
      let month = Number(matches[2]);
      let day = Number(matches[3]);
      if(isNaN(year) || isNaN(month) || isNaN(day) ){
        return;
      }
      let indexDate = new Date(year, month, day, 0, 0, 0, 0);
      let now = new Date();
      let thirtyDaysMillis = 1000 * 60 * 60 * 24 * 30;
      // if the index is older than 30 days delete it
      if((now.getTime() - thirtyDaysMillis) >  indexDate.getTime()){

        client.indices.delete({index});
      }

    })
  }catch(err){
    console.log(err)
  }
}

// returns format `${index}-2020-12-31`
function getTimeBasedIndexName(index){
  let now = new Date();
  let indexName =`${index}-${now.getFullYear()}-`;
  // add the month
  indexName += String((now.getMonth() + 1)).padStart(2, '0') + '-';
  // add the day
  indexName += String((now.getDate())).padStart(2, '0');
  return indexName;
}

function getSession(client, index, typeName, id){
  return new Promise(async (resolve, reject)=>{
    try{
      let res = await client.search({
        index: `${index}-*`,
        type: typeName,
        body: {
          query: {
            ids : {
              values : [ id]
            }
          }
        }
      });
      if (typeof res == 'undefined' || typeof res.body == 'undefined'){
        resolve(null);
      }
      if(res.body.hits && res.body.hits.total && res.body.hits.total.value === 0){
        resolve(null);
      }
      resolve(res.body.hits.hits[0]._source)
    }catch(err){
      reject(err);
    }
  })
}

util.inherits(ElasticSearchSessionStore, Session.Store);

_.extend(ElasticSearchSessionStore.prototype, {

  connect: function (callback) {
    console.log('connecting')
    var self = this;

    this.isConnected = false;

    this.client = new Client(this.options);

    var callbacked = false;
    this.closeCalled = false;
    // clean up old indices once per day
    setInterval(()=>{
      await clearOldIndices(this.client, this.index);
    },(24 * 60 * 60 * 1000));
    

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
            try{
              init(self.client, self.index, self.typeName)
              self.isConnected = true;
              self.emit('connect');
              if (callback && !callbacked) {
                callbacked = true;
                callback(err, self);
              }
            }catch(err){
              if (err) {
                if (callback && !callbacked) {
                  callbacked = true;
                  callback(err, self);
                }
                return;
              }
            }
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

  set: async function (sid, sess, callback) {
    if (sess && sess.cookie && sess.cookie.expires) {
      sess.expiry = new Date(sess.cookie.expires);
    } else {
      sess.expiry = new Date(Date.now() + this.options.ttl * 1000);
    }

    // We cannot use client.exists because it doesn't allow globbed indices
    let existingSession = await getSession(this.client, this.index, this.typeName, ( this.options.prefix + sid));
    var methodName = undefined;
    if (!existingSession) {
      methodName = 'create';
    }
    try{
      let res = await this.client.index({
        index: getTimeBasedIndexName(this.index),
        type: this.typeName,
        id: this.options.prefix + sid,
        opType: methodName,
        body: sess,
        refresh: true
      })
      callback(null, res);
    }catch(err){
      if (err && (err.message.toLowerCase().indexOf('version') >= 0)) {
        return callback(new Error('ConcurrencyError: Session was updated by someone else!'));
      }
      callback(err);
    }
  },

  //touch: function (sid, sess, callback) {
  //  this.set(sid, sess, callback);
  //},

  get: async function (sid, callback) {
    let indices =  await getIndices(this.client, this.index);
    if(indices.length === 0){
      return callback(null, null);
    }
    // we cannot use client.get because it does not allow globbed index names
    try{
      let sess = await getSession(this.client, this.index, this.typeName, ( this.options.prefix + sid));
      if(!sess){
        return callback(null, null);
      }
      // convert date string to date object
      sess.expiry = new Date(sess.expiry)
      if (sess.expiry && sess.expiry.getTime() > Date.now()) {
        delete sess.expiry;
        return callback(null, sess);
      }
    }catch(err){
      return callback(err)
    }
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
    let indices = self.client.cat.indices({
      index: `${this.index}-*`
    })
    indices.forEach(index =>{
      self.client.indices.delete({index}, function (err) {
        if (callback) callback(err);
      });
    })
  }

});

module.exports = ElasticSearchSessionStore;
