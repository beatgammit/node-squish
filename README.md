Intro
=====

Squish your output using whatever compression you like.

This has only been tested on static files, but there's no reason it shouldn't work on other stuff too. If it fails, create an issue or, better yet, fork and fix!

How it works
------------

Squish intercepts all calls to `write` and `end` in the connect stack and applies whatever compression algoritm you pass in.

If a client does not support your algorithm, squish won't intercept or compress anything.

Examples
========

Alright, whatever, here is a working example of how to use this module:

	var connect = require('connect'),
		compressor = require('compressor'),
		squish = require('squish');
	
	connect(
		squish('gzip', compressor.GzipStream),
		connect.static('./')
	).listen(8080);

Compressor is a great little utility, and it's hosted on GitHub.  The best thing about it is that it's a Stream, so it's nice to work with.

API
===

Aside from what you've seen, there really isn't an API.

There are only two parameters, both of which are necessary:

`compress(compressionType, streamConstructor)`

* compressionType- a string, whatever you choose (like gzip, zip, etc)
* streamConstructor- a function (without args) that will give me a stream
  * I need a constructor because I need a new one for each request
  * Must emit these events: 'data', 'end' (I also like 'error', but no biggie)

Oh, go ahead and set 'Content-Length'. If the client supports your compression, I will get rid of it, otherwise I won't touch it.

That's it!
