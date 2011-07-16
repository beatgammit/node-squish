Running the Test
================

For now there's only one test, so this makes things pretty easy.

* Start gzip server- `cd servers ; ./gzip.js`
* Run the test- `./test-gzip.js`

The default port for the gzip server is port 2000. The first parameter is the port, so it can be changed on the fly:

`./gzip.js 3000`

The test acts the same way:

`./test-gzip.js 3000`
