#!/usr/bin/env node
(function () {
	'use strict';

	var connect = require('connect'),
		compressor = require('compressor'),
		squish = require('../../lib/squish'),
		port = process.argv[2] || 2000;

	connect(
		squish([{type: 'gzip', constructor: compressor.GzipStream}]),
		connect.static('./public')
	).listen(port, function () {
		console.log('Server on port ' + port);
	});
}());
