(function () {
	"use strict";

	var construct = require('construct');

	/*
	 * Creates a buffer from a string.
	 * If the first parameter is already a Buffer, it is returned.
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
	 * Does all the cool voodoo magic that needs to happen to intercept outgoing data.
	 *
	 * @param res- The response object from node
	 * @param compressor- An object with at least a type object and a constructor object
	 */
	function registerCompressor(res, compressor) {
		var outStream,
			twrite,
			tend,
			twriteHead,
			first = true;

		outStream = construct(compressor.constructor, compressor.args);
		twrite = res.write;
		twriteHead = res.writeHead;
		tend = res.end;

		try {
			// set the headers and override response write functions
			res.setHeader('Content-Encoding', compressor.type);

			// compressing changes the length, so we need ta make sure
			// that Content-Length isn't set or the request won't end
			res.removeHeader('content-cength');
		} catch (e) {
			console.error('Squish could not manipulate headers.');
			console.error('A response has probably been started but not ended.');
			console.error('Abandoning ship (you should probably fix this).');

			throw e;
		}

		outStream.on('data', function (data) {
			twrite.call(res, data, 'binary');
		}).on('end', function () {
			tend.call(res);
		}).on('error', function (err) {
			console.error(err);
			tend.call(res);
		});

		res.writeHead = function (statusCode, reasonPhrase, headers) {
			if (typeof reasonPhrase !== 'string') {
				headers = reasonPhrase;
			}

			if (headers) {
				if (headers['content-length']) {
					delete headers['content-length'];
				}
			}
			if (this._headers) {
				if (this._headers['content-length']) {
					delete this._headers['content-length'];
				}
			}

			twriteHead.apply(this, arguments);
		};

		res.write = function (chunk, encoding) {
			var buffer;

			if (chunk) {
				buffer = createBuffer(chunk, encoding);

				first = false;

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

	/*
	 * Squish will take any compression stream and squish all outgoing
	 * data following the this module on the connect stack.
	 * 
	 * If the compression format given is not supported by the client,
	 * compression will not be applied.
	 *
	 * @param compressors- Array of compressors (object with type and constructor) 
	 * @return Function to act as middleware
	 */
	function squish(compressors) {
		var types = [];

		if (!compressors || !(compressors instanceof Array)) {
			throw 'Invalid parameter. First argument must be an array.';
		}

		compressors.forEach(function (compressor, i) {
			if (!compressor.type || typeof compressor.type !== 'string') {
				throw 'Invalid compressor at index ' + i + '. The type property must be a string.';
			}

			if (!compressor.constructor || typeof compressor.constructor !== 'function') {
				throw 'Invalid compressor at index ' + i + '. The compressor property must be a function.';
			}

			// make sure there aren't any spaces to begin with
			compressor.type = compressor.type.trim();

			types.push(compressor.type);
		});

		return function (req, res, next) {
			var best,
				encodings = req.headers['accept-encoding'],
				identity,
				matchFound = false;

			// if the header is not set or if the header is *, the requester doesn't care
			if (typeof encodings === 'undefined' || encodings.trim() === '*') {
				// just use the first
				registerCompressor(res, compressors[0]);
				return next();
			} else if (encodings.trim() === '') {
				// the user obviously doesn't want our compression ='(
				return next();
			}

			encodings = encodings.split(',');

			// fix up the encodings so I can read them
			encodings.forEach(function (encoding, i) {
				var t = encoding.split(';'),
					type = t[0].trim(),
					q = t[1] ? +t[1].split('=')[1] : 1;

				encodings[i] = {
					"type": type,
					"q": q
				};

				// special case for identity
				if (type === 'identity') {
					if (!identity || q === 0 || q > identity.q) {
						identity = encodings[i];
					}
				} else if (type === '*' && q === 0 && !identity) {
					identity = {
						'type': type,
						'q': q
					};
				}
			});

			// see if we have a compressor that will work
			compressors.some(function (compressor) {
				var match;

				encodings.some(function (enc) {
					// quality control; first supported q=1 or highest supported q wins
					if (enc.type === compressor.type || enc.type === '*') {
						if (enc.q === 0) {
							return false;
						}

						if (enc.q === 1) {
							match = enc.type;
							return true;
						} else if (!best || enc.q > best.q) {
							best = compressor;
							best.q = enc.q;
						}
					}
				});

				if (match) {
					registerCompressor(res, compressor)
					best = undefined;
					matchFound = true;

					// break out of the loop
					return true;
				}
			});

			if (best) {
				registerCompressor(res, best);
				matchFound = true;
			}
	
			if (!matchFound && identity && identity.q === 0) {
				res.writeHead(406, {
					'Content-Type': 'application/json'
				});

				res.end(JSON.stringify(types));
				return;
			}

			return next();
		};
	}

	module.exports = squish;
}());
