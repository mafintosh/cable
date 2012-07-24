var cable = require('./index');

cable.listen()
	.on('request', function(message, callback) {
		callback(null, message);
	})
	.ready(function(addr) {
		var then = Date.now();
		var msg = 10000;

		for (var i = 0; i < msg-1; i++) {
			cable(addr, {hello:'world'});
		}
		cable(addr, {hello:'world'}, function(err, echo) {
			if (echo.hello !== 'world') throw new Error('invalid echo');
			var delta = Date.now()-then;

			console.error(Math.round(1000*msg/delta)+' req/s ('+delta+' ms)');
			process.exit(0);
		});
	});
