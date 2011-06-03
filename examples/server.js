var connect = require('connect'),
	compressor = require('compressor'),
	squish = require('../lib/squish'),
	port = 2000;

connect(
	squish('gzip', compressor.GzipStream),
	connect.static('./')
).listen(port, function () {
	console.log('Server on port ' + port);
});
