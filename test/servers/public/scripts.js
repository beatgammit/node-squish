(function () {
	'use strict';

	$.domReady(function () {
		$('#get-date').bind('click', function () {
			$.ajax({
				'url': '/date',
				'type': 'json',
				'method': 'GET',
				'success': function (data) {
					alert('The current date is: ' + new Date(data.date));
				}
			});
		});
	});
}());
