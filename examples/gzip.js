#!/usr/bin/env node
(function () {
	'use strict';

	var connect = require('connect'),
		compressor = require('compressor'),
		squish = require('../lib/squish'),
		port = 2200;

	connect(
		squish('gzip', compressor.GzipStream),
		connect.static('./public')
	).listen(port, function () {
		console.log('Server on port ' + port);
	});
}());
