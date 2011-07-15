#!/usr/bin/env node
(function () {
	var http = require('http'),
		host = 'localhost',
		forEachAsync = require('forEachAsync'),
		port = process.argv[2] || 2000,
		method = 'GET',
		allPassed = true,
		tests = [
			{
				'test': 'empty encoding',
				'options': {
					'host': host,
					'port': port,
					'method': method,
					'headers': {
						'Accept-Encoding': ''
					}
				},
				'expected': {
					'headers': {
						'content-encoding': undefined
					},
					'statusCode': 200
				}
			},
			{
				'test': 'no encoding',
				'options': {
					'host': host,
					'port': port,
					'method': method
				},
				'expected': {
					'headers': {
						'content-encoding': 'gzip'
					},
					'statusCode': 200
				}
			},
			{
				'test': 'unsupported encoding',
				'options': {
					'host': host,
					'port': port,
					'method': method,
					'headers': {
						'Accept-Encoding': 'deflate'
					}
				},
				'expected': {
					'headers': {
						'content-encoding': undefined
					},
					'statusCode': 200
				}
			},
			{
				'test': 'supported encoding',
				'options': {
					'host': host,
					'port': port,
					'method': method,
					'headers': {
						'Accept-Encoding': 'gzip'
					}
				},
				'expected': {
					'headers': {
						'content-encoding': 'gzip'
					},
					'statusCode': 200
				}
			},
			{
				'test': '* encoding',
				'options': {
					'host': host,
					'port': port,
					'method': method,
					'headers': {
						'Accept-Encoding': '*'
					}
				},
				'expected': {
					'headers': {
						'content-encoding': 'gzip'
					},
					'statusCode': 200
				}
			},
			{
				'test': 'multiple encoding- *',
				'options': {
					'host': host,
					'port': port,
					'method': method,
					'headers': {
						'Accept-Encoding': 'deflate, *'
					}
				},
				'expected': {
					'headers': {
						'content-encoding': 'gzip'
					},
					'statusCode': 200
				}
			},
			{
				'test': 'multiple encoding- *;q=0',
				'options': {
					'host': host,
					'port': port,
					'method': method,
					'headers': {
						'Accept-Encoding': 'deflate, *;q=0'
					}
				},
				'expected': {
					'headers': {
						'content-encoding': undefined
					},
					'statusCode': 406
				}
			},
			{
				'test': 'no identity allowed',
				'options': {
					'host': host,
					'port': port,
					'method': method,
					'headers': {
						'Accept-Encoding': 'identity;q=0'
					}
				},
				'expected': {
					'headers': {
						'content-encoding': undefined
					},
					'statusCode': 406
				}
			}
		];

	forEachAsync(tests, function (next, test) {
		console.log('Test:', test.test);

		var req = http.request(test.options, function (res) {
			var passed = true;

			if (res.statusCode !== test.expected.statusCode) {
				console.log('FAIL: Incorrect statusCode. Expected:', test.expected.statusCode, '; Actual:', res.statusCode);
				passed = false;
			} else {
				Object.keys(test.expected.headers).some(function (header) {
					if (test.expected.headers[header] !== res.headers[header]) {
						console.log('FAIL: Unexpected header. Expected:', test.expected.headers[header], '; Actual:', res.headers[header]);
						passed = false;

						return true;
					}
				});
			}

			if (passed) {
				console.log('Test passed!');
			} else {
				allPassed = false;
			}

			console.log();

			next();
		});

		req.on('error', function (err) {
			console.error('Error with request:', err);
			console.error();

			allPassed = false;

			next();
		});

		req.end();
	}).then(function () {
		if (allPassed) {
			console.log('All tests passed!');
		} else {
			console.log('FAIL');
		}
	});
}());
