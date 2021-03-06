Intro
=====

Squish your output using whatever compression you choose.

Squish strives to be as standards compliant as possible. The spec used as a reference can be found [here](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.3).

**Note**

This module can potentially send a 406 error (as per the spec) if the user explicitly tells it to. The only ways to do this are to set `Accept-Encoding: identity;0` or to not set identity and set `Accept-Encoding: *;0`. If you or your clients do that, the request shall be granted.

**Disclaimer:**

Squish assumes that the response hasn't been sent yet. Errors will occur if a response is started (by calling writeHead or write) and not ended. If this happens, squish will try to give you some useful info then throw an error.

As always, if something fails, create an issue. Better yet, fork and fix!

How it works
------------

Squish intercepts all calls to `write` and `end` in the connect stack and applies whatever compression algoritm you pass in.

If a client does not support your algorithm, squish won't intercept or compress anything.

Examples
========

Here is a working example of how to use this module:

	var connect = require('connect'),
		compressor = require('compressor'),
		squish = require('squish');
	
	connect(
		squish([{"type": 'gzip', "constructor": compressor.GzipStream}]),
		connect.static('./')
	).listen(8080);

Compressor is a great little utility, and it's hosted on GitHub.  The best thing about it is that it's a Stream, so it's nice to work with.

API
===

Aside from what you've seen, the API is pretty simple.

There is only one parameter, an array of objects. Each object has three properties:

* type- gzip, zip, etc.
* constructor- the constructor for the compression algorithm
  * Should be an instance of EventEmitter
  * Must emit these events: 'data', 'end' ('error' events will be console.error'd)
* args- arguments to pass to the constructor (can be an array or an `arguments` object, optional)

On each request, squish will check each compression algorithm against the `Accept-Encoding` header. The first supported compression algorithm is used. If none are supported, nothing is compressed.

If the client supports your compression, I will get rid of the 'Content-Length' header; otherwise I won't touch it.

That's it!
