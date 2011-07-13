(function () {
	"use strict";

	/*
	 * Creates a buffer from a string.
	 * If the first parameter is alread a Buffer, it is returned.
	 * 
	 * @param str- String to Bufferize
	 * @param enc- encoding; if none specified, utf8 is assumed
	 * @return A new buffer or the original if it was already a buffer
	 */
	function createBuffer(str, enc) {
		var len, buf;

		if (str.constructor === Buffer) {
			return str;
		}

		enc = enc || 'utf8';

		len = Buffer.byteLength(str, enc);
		buf = new Buffer(len);
		buf.write(str, enc, 0);
		return buf;
	}

	/*
	 * Squish will take any compression stream and squish all outgoing
	 * data following the this module on the connect stack.
	 * 
	 * If the compression format given is not supported by the client,
	 * compression will not be applied.
	 * 
	 * @param streamType- type of compression (e.g. gzip)
	 * @param StreamConst- constructor for compression stream
	 * @return Function to act as middleware
	 */
	function squish(streamType, StreamConst) {
		return function (req, res, next) {
			var outStream,
				regex,
				twrite,
				tend,
				regex = new RegExp(streamType),
				first = true;



			// we'll only do something if the client accepts gzip encoding
			if (regex.test(req.headers['accept-encoding'])) {
				outStream = new StreamConst();
				twrite = res.write;
				tend = res.end;

				// set the headers and override response write functions
				res.setHeader('Content-Encoding', streamType);

				outStream.on('data', function (data) {
					twrite.call(res, data, 'binary');
				}).on('end', function () {
					tend.call(res);
				}).on('error', function (err) {
					console.error(err);
					tend.call(res);
				});

				res.write = function (chunk, encoding) {
					var buffer;

					if (chunk) {
						buffer = createBuffer(chunk, encoding);

						// compressing changes the length, so we need ta make sure
						// that Content-Length isn't set or the request won't end
						if (first) {
							res.removeHeader('Content-Length');

							first = false;
						}

						outStream.write(buffer);
					}
				};

				res.end = function (chunk, encoding) {
					if (chunk) {
						res.write(chunk, encoding);
					}

					// first will only be true if nothing has been written
					if (first) {
						tend.call(res);
					} else {
						outStream.close();
					}
				};
			}

			return next();
		};
	}

	module.exports = squish;
}());
