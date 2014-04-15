'use strict';
module.exports.start = function (port) {
	var express = require('express'),
		uuid = require('uuid'),
		aws = require('aws-sdk'),
		dynamo,
		app = express();
	
	// Configuration
	app.configure(function () {
		// some restful service calls (POST, PUT)
		// send data in the 'body' of the request
		// so we need to let express parse the body to get the parameters out
		// we only expect json in bodies
		app.use(express.json());

		// this enables the code below that specifies the functions
		// executed for specific URL requests
		app.use(app.router);
	
		// load the amazon credentials
		// note this 'clobbers' any previous configuration
		aws.config.loadFromPath('./amazonCred.json');
	
		dynamo = new aws.DynamoDB();
	});

	app.get('/listTables', function (req, res) {
		dynamo.listTables(function(err, data) {
			if (err) {
				res.json(err);
			} else {
				res.json(data.TableNames);
			}
		});
	});

	app.get('/createTable', function (req, res) {
		var tableDef = {
			TableName: 'dealItUp',
			AttributeDefinitions: [
				{ AttributeName: 'id', AttributeType: 'S' }
			],
			KeySchema:[
				{ AttributeName: 'id', KeyType: 'HASH' }
			],
			ProvisionedThroughput: {
				ReadCapacityUnits: 12,
				WriteCapacityUnits: 6,
			}
		};
		dynamo.createTable(tableDef, function(err, data) {
			if (err) {
				res.json(err);
			} else {
				res.json(data.TableDescription);
			}
		});
	});

	app.get('/deck/:id', function (req, res) {
		var id = req.params.id;
	
		dynamo.getItem({ TableName: 'dealItUp', Key: { id: { S: id } },
			AttributesToGet : [ 'id', 'deck', 'drawn', 'discarded', 'removed' ] },
			function (err, data) {
				if (err) {
					res.json(400, { error: 'database error', dbError: err });
				} else {
					// got it
					if (data.Item) {
						res.json(200, { id: id, deck: JSON.parse(data.Item.deck.S),
							drawn: JSON.parse(data.Item.drawn.S),
							discarded: JSON.parse(data.Item.discarded.S),
							removed: JSON.parse(data.Item.removed.S) });
					} else {
						res.json(404, { id: id, message: 'deck not found' });
					}
				}
			});
	});

	// create new storage for a deck
	app.post('/deck', function (req, res) {
		var aUuid = uuid.v4(), // need a unique id for deck storage
			body = req.body,
			deck = body && body.deck,
			drawn = body && body.drawn,
			discarded = body && body.discarded,
			removed = body && body.removed;
		
		if (deck && drawn && discarded && removed) {
			dynamo.putItem({ TableName: 'dealItUp',
				Item: { id: { S: aUuid },
					deck: { S: JSON.stringify(deck) },
					drawn: { S: JSON.stringify(drawn) },
					discarded: { S: JSON.stringify(discarded) },
					removed: { S: JSON.stringify(removed) } } },
					function (err) {
						if (err) {
							res.json(400, { error: 'database error', dbError: err});
						} else {
							// give the client the deck id 201 === created
							res.json(201, { id: aUuid });
						}
					});
		} else {
			res.json(400, { error: 'deck, drawn, discarded and removed must be specified' });
		}
		
	});

	// delete a deck from storage
	app.delete('/deck/:id', function (req, res) {
		var id = req.params.id;

		dynamo.deleteItem({ TableName: 'dealItUp',
			Key: { id: { S: id } },
			Expected: { id: { Exists: true, Value: { S: id } } } },
			function (err) {
				if (err) {
					res.json(404, { error: 'database error', dbError: err });
				} else {
					res.json(200, { id: id });
				}
			});
	});


	// update a deck - error if no deck
	// body contains parameters (so no id in the url)
	app.put('/deck', function (req, res) {
		var body = req.body,
			id = body && body.id,
			deck = body && body.deck,
			drawn = body && body.drawn,
			discarded = body && body.discarded,
			removed = body && body.removed;
	
		if (id && deck && drawn && discarded && removed) {
			dynamo.putItem({ TableName: 'dealItUp',
				Item: { id: { S: id },
					deck: { S: JSON.stringify(deck) },
					drawn: { S: JSON.stringify(drawn) },
					discarded: { S: JSON.stringify(discarded) },
					removed: { S: JSON.stringify(removed) } } },
				function (err) {
					if (err) {
						res.json(400, { error: 'database error' , dbError: err });
					} else {
						res.json(200, { id: id });
					}
				});
		} else {
			res.json(400, { error: 'id, deck, drawn, discarded and removed must be specified', id: id });
		}
	});


	//console.log('deck storage running localhost:' + port);
	var listen = app.listen(port);
	console.log('deck storage running localhost:' + port);
	return listen;
};
