var http = require('http');
var url = 'http://www.uestc.edu.cn/';
for (var i = 0; i < 10; i++) {
	(function() {
		http.get(url, function(res) {
				var html = '';
				res.on('data', function(data) {
					html = html + data;

				});
				res.on('end', function() {
					console.log(i);
				})
			})
			.on('error', function() {
				console.log('there are some error')
			})
	})(i)

}