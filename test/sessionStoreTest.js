var expect = require('expect.js'),
    sessionStore = require('../lib/sessionstore');

describe('SessionStore', function() {
    describe('calling library.getExpressSession()', function() {
        it('should return a valid session function', function(){
            var library = require('../lib/library');
            var session = library.getExpressSession();

            expect(session).to.be.a('function');
        });
    });

	describe('calling createSessionStore', function() {
		describe('without options', function() {
			it('it should return with the in memory store', function() {
				var ss = sessionStore.createSessionStore();
				expect(ss).to.be.a('object');
			});
		});

		describe('with options containing a type property with the value of', function() {
			describe('an existing db implementation of mongoDb', function() {
				it('it should return a new store', function() {
					var ss = sessionStore.createSessionStore({ type: 'mongoDb' });
					expect(ss).to.be.a('object');
				});
			});

            describe('an existing db implementation of redis', function() {
                it('it should return a new store', function() {
                    var store = sessionStore.createSessionStore({ type: 'redis' });
                    expect(store).to.be.a('object');
                });

                it('it should set and get a session', function(done) {
                    sessionStore.createSessionStore({ type: 'redis' }, function(err, store){
                        // #set()
                        store.set('123', { cookie: { maxAge: 2000 }, name: 'joe' }, function(err, result){
                            expect(err).to.be(null);
                            expect(result).to.be('OK');

                            // #get()
                            store.get('123', function(err, data){
                                expect(data.name).to.be('joe');

                                // #set()
                                store.set('123', { cookie: { maxAge: 2000 }, name: 'jimmy' }, function(err, ok){

                                    // #get()
                                    store.get('123', function(err, data){
                                        expect(data.name).to.be('jimmy');

                                        // #destroy()
                                        store.destroy('123', function(err, result){
                                            expect(err).to.be(null);
                                            expect(result).to.be(1);

                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });

            describe('an existing db implementation of memcached', function() {
                it('it should return a new store', function() {
                    var store = sessionStore.createSessionStore({ type: 'memcached' });
                    expect(store).to.be.a('object');
                });

                it('it should set and get a session', function(done) {
                    sessionStore.createSessionStore({ type: 'memcached' }, function(err, store) {
                        // #set()
                        store.set('123', { cookie: { maxAge: 2000 }, name: 'joe' }, function(err, result){
                            expect(err).to.be(null);
                            expect(result).to.be.ok();

                            // #get()
                            store.get('123', function(err, data) {
                                expect(data.name).to.be('joe');

                                // #set()
                                store.set('123', { cookie: { maxAge: 2000 }, name: 'jimmy' }, function(err, ok){

                                    // #get()
                                    store.get('123', function(err, data){
                                        expect(data.name).to.be('jimmy');

                                        // #destroy()
                                        store.destroy('123', function(err, result){
                                            expect(err).to.be(null);
                                            expect(result).to.be.ok();
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });

			describe('a non existing db implementation', function() {
				it('it should return a new store', function() {
					var ss = sessionStore.createSessionStore({ type: 'strangeDb' });

					expect(ss).to.be.a('object');
				});
			});
		});
	});
});