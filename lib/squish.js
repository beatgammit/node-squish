(function () {
	"use strict";

	/*
	 * Calls a constructor with an arbitrary number of arguments.
	 * 
	 * This idea was taken from a StackOverflow answer:
	 * http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible/1608546#1608546
	 *
	 * @param constructor- Constructor to call
	 * @param args- the arguments to apply to constructor
	 * @return A 'new' instance of the constructor
	 */
	function construct(constructor, args) {
		function F() {
			return constructor.apply(this, args);
		}

		F.prototype = constructor.prototype;

		return new F();
	}

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

	function registerCompressor(res, compressor) {
		var outStream,
			twrite,
			tend,
			first = true;

		outStream = construct(compressor.constructor, compressor.args);
		twrite = res.write;
		tend = res.end;

		// set the headers and override response write functions
		res.setHeader('Content-Encoding', compressor.type);

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

		return true;
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

				if (match && registerCompressor(res, compressor)) {
					best = undefined;

					matchFound = true;

					// break out of the loop
					return true;
				}
			});

			if (best) {
				matchFound = registerCompressor(res, best);
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
