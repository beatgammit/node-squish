#!/usr/bin/env node
(function () {
	'use strict';

	var connect = require('connect'),
		compressor = require('compressor'),
		squish = require('../../lib/squish'),
		port = process.argv[2] || 2000;

	function route(app) {
		app.get('/date', function (req, res) {
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify({'date': +new Date()}));
		});;
	}

	connect(
		squish([{type: 'gzip', constructor: compressor.GzipStream}]),
		connect.router(route),
		connect.static('./public')
	).listen(port, function () {
		console.log('Server on port ' + port);
	});
}());
