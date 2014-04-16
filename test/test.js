/* global describe: false */
/* global it: false */
/* global beforeEach: false */
/* global afterEach: false */
/* jshint unused: false */
/* jshint expr: true */
/* jshint maxcomplexity: 10 */

'use strict';

var should = require('should'),
	rollerStorage = require('../lib/rollerStorage'),
	request = require('supertest');

describe('roller storage', function () {

	var app;

	beforeEach(function (done) {
		app = rollerStorage.start(3002);
		done();
	});

	afterEach(function (done) {
		app.close();
		done();
	});

	function randomInt(max) {
		return Math.floor(Math.random() * Math.floor(max)) + 1;
	}

	describe('get', function (done) {
		it('gets an existing roller', function (done) {
			var uniqueDice = [randomInt(20), randomInt(20)],
				uniqueBonus = randomInt(4);
			// create a deck
			request(app)
				.post('/roller')
				.send({ dice: uniqueDice,
					bonus: uniqueBonus })
				.set('Accept', 'application/json')
				.set('Content-type', 'application/json')
				.expect(201)
				.expect(function (res) {
					if (!res.body.id) {
						return 'no id returned';
					}
				})
				.end(function(err, res){
					var originalId;
					if (err) {
						return done(err);
					}
					originalId = res.body.id;
					// we should be able to get the deck
					request(app)
						.get('/roller/' + originalId)
						.set('Accept', 'application/json')
						.set('Content-type', 'application/json')
						.expect(200)
						.expect(function (res) {
							if (res.body.id !== originalId) {
								return 'id mismatch on get';
							} else if (!res.body.dice) {
								return 'no roller data';
							} else if (res.body.dice[0] !== uniqueDice[0] ||
								res.body.dice[1] !== uniqueDice[1] ||
								res.body.bonus !== uniqueBonus
								) {
								console.log('body ', res.body);
								return 'incorrect roller data';
							}
						})
						.end(function(err, res){
							done(err);
						});
				});
		});
	});

	describe('post', function (done) {
		it('returns a storage id which can be used to retrieve the roller', function (done) {
			var uniqueDice = [randomInt(20), randomInt(20)],
				uniqueBonus = randomInt(4);
			request(app)
				.post('/roller')
				.send({ dice: uniqueDice,
					bonus: uniqueBonus })
				.set('Accept', 'application/json')
				.set('Content-type', 'application/json')
				.expect(201)
				.expect(function (res) {
					if (!res.body.id) {
						return 'no id returned';
					}
				})
				.end(function (err, res) {
					if (err) {
						return done(err);
					}
					request(app)
						.get('/roller/' + res.body.id)
						.set('Accept', 'application/json')
						.expect(200)
						.expect(function (res) {
							if (res.body.dice[0] !== uniqueDice[0] ||
								res.body.dice[1] !== uniqueDice[1] ||
								res.body.bonus !== uniqueBonus
								) {
								return 'get request did not return correct roller';
							}
						})
						.end(function(err, res){
							done(err);
						});
				});
		});
	});

	describe('delete', function (done) {
		it('removes an existing roller', function (done) {
			var uniqueDice = [randomInt(20), randomInt(20)],
				uniqueBonus = randomInt(4);
			// create a deck
			request(app)
				.post('/roller')
				.send({ dice: uniqueDice,
					bonus: uniqueBonus })
				.set('Accept', 'application/json')
				.set('Content-type', 'application/json')
				.expect(201)
				.expect(function (res) {
					if (!res.body.id) {
						return 'no id returned';
					}
				})
				.end(function (err, res) {
					var originalId;
					if (err) {
						return done(err);
					}
					originalId = res.body.id;
					// delete the deck
					request(app)
						.del('/roller/' + originalId)
						.set('Accept', 'application/json')
						.expect(200)
						.expect(function (res) {
							if (res.body.id !== originalId) {
								return 'delete request did not return correct deck id';
							}
						})
						.end(function(err, res){
							if (err) {
								return done(err);
							}
							// we should not be able to get the deck
							request(app)
								.get('/roller/' + originalId)
								.set('Accept', 'application/json')
								.expect(404)
								.end(function(err, res){
									done(err);
								});
						});
				});
		});
	});

	describe('put', function (done) {
		it('update a roller', function (done) {
			var uniqueDice = [randomInt(20), randomInt(20)],
				uniqueBonus = randomInt(4);
			// create a deck with some unique data
			request(app)
				.post('/roller')
				.send({ dice: uniqueDice,
					bonus: uniqueBonus })
				.set('Accept', 'application/json')
				.set('Content-type', 'application/json')
				.expect(201)
				.expect(function (res) {
					if (!res.body.id) {
						return 'no id returned';
					}
				})
				.end(function (err, res) {
					var uniqueDice,
						uniqueBonus,
						rollerId;
					if (err) {
						return done(err);
					}
					uniqueDice = [randomInt(20), randomInt(20)];
					uniqueBonus = randomInt(4);
					rollerId = res.body.id;
					// update the deck
					request(app)
						.put('/roller')
						.send({ id: rollerId,
							dice: uniqueDice,
							bonus: uniqueBonus })
						.set('Accept', 'application/json')
						.set('Content-type', 'application/json')
						.expect(200)
						.expect(function (res) {
							if (res.body.id !== rollerId) {
								return 'put request did not return correct roller id';
							}
						})
						.end(function(err, res){
							// get the deck and check that it has the new data
							request(app)
								.get('/roller/' + rollerId)
								.set('Accept', 'application/json')
								.expect(200)
								.expect(function (res) {
									if (res.body.id !== rollerId) {
										return 'wrong id returned on get';
									} else if (!res.body.dice) {
										return 'no dice returned on get';
									} else if (res.body.dice[0] !== uniqueDice[0] ||
										res.body.dice[1] !== uniqueDice[1] ||
										res.body.bonus !== uniqueBonus) {
										return 'deck data was not updated';
									}
								})
								.end(function(err, res){
									done(err);
								});
						});
				});
		});
	});

});