var net     = require('net');
var cluster = require('cluster');

var network = function() {
	var faces = require('os').networkInterfaces();

	for (var i in faces) {
		for (var j = 0; j < faces[i].length; j++) {
			if (faces[i][j].family === 'IPv4' && !faces[i][j].internal) {
				return faces[i][j].address;
			}
		}
	}
	return '127.0.0.1';
};

module.exports = function(port) {
	var server = net.createServer();
	var bind;

	server.setMaxListeners(0);
	server.once('listening', function() {
		server.emit('bind', bind = network()+':'+server.address().port);
	});
	server.ready = function(fn) {
		if (bind) return fn(bind);
		server.once('bind', fn);
	};

	if (port || !cluster.isWorker) {
		server.listen(port);
	} else {
		var env = process.env;

		process.env = {};
		cluster.isWorker = false;
		server.listen(port);
		process.env = env;
		cluster.isWorker = true;		
	}
	return server;
};