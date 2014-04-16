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
			TableName: 'rollers',
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

	app.get('/roller/:id', function (req, res) {
		var id = req.params.id;
	
		dynamo.getItem({ TableName: 'rollers', Key: { id: { S: id } },
			AttributesToGet : [ 'id', 'dice', 'bonus' ] },
			function (err, data) {
				if (err) {
					res.json(400, { error: 'database error', dbError: err });
				} else {
					// got it
					if (data.Item) {
						res.json(200, { id: id, dice: JSON.parse(data.Item.dice.S),
							bonus: JSON.parse(data.Item.bonus.S) });
					} else {
						res.json(404, { id: id, message: 'roller not found' });
					}
				}
			});
	});

	// create new storage for a roller
	app.post('/roller', function (req, res) {
		var aUuid = uuid.v4(), // need a unique id for deck storage
			body = req.body,
			dice = body && body.dice,
			bonus = (body && body.bonus) || 0;
		
		if (dice && Array.isArray(dice)) {
			dynamo.putItem({ TableName: 'rollers',
				Item: { id: { S: aUuid },
					dice: { S: JSON.stringify(dice) },
					bonus: { S: JSON.stringify(bonus) } } },
					function (err) {
						if (err) {
							res.json(400, { error: 'database error', dbError: err});
						} else {
							// give the client the roller id 201 === created
							res.json(201, { id: aUuid });
						}
					});
		} else {
			res.json(400, { error: 'dice must be specified as an array ex. [6, 6, 12]' });
		}
		
	});

	// delete a roller from storage
	app.delete('/roller/:id', function (req, res) {
		var id = req.params.id;

		dynamo.deleteItem({ TableName: 'rollers',
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


	// update a roller - error if no roller
	// body contains parameters (so no id in the url)
	app.put('/roller', function (req, res) {
		var body = req.body,
			id = body && body.id,
			dice = body && body.dice,
			bonus = (body && body.bonus) || 0;
	
		if (id && dice && Array.isArray(dice)) {
			dynamo.putItem({ TableName: 'rollers',
				Item: { id: { S: id },
					dice: { S: JSON.stringify(dice) },
					bonus: { S: JSON.stringify(bonus) } } },
				function (err) {
					if (err) {
						res.json(400, { error: 'database error' , dbError: err });
					} else {
						res.json(200, { id: id });
					}
				});
		} else {
			res.json(400, { error: 'id and dice (an array) must be specified', id: id });
		}
	});


	//console.log('deck storage running localhost:' + port);
	var listen = app.listen(port);
	console.log('roller storage running localhost:' + port);
	return listen;
};
