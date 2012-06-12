var expect = require('expect.js')
  , sessionStore = require('../lib/sessionstore');

describe('SessionStore', function() {

	describe('calling createSessionStore', function() {

		describe('without options', function() {

			it('it should return with the in memory store', function() {

				var ss = sessionStore.createSessionStore();
				expect(ss).to.be.a(require('express').session.MemoryStore);

			});

		});

		describe('with options containing a type property with the value of', function() {

			describe('an existing db implementation', function() {

				it('it should return a new store', function() {

					var ss = sessionStore.createSessionStore({ type: 'mongoDb' });
					expect(ss).to.be.a('object');

				});

			});

			describe('a non existing db implementation', function() {

				it('it should return a new store', function() {

					var ss = sessionStore.createSessionStore({ type: 'strangeDb' });
					expect(ss).to.be.a(require('express').session.MemoryStore);

				});

			});

		});

	});

});