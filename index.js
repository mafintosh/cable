var net     = require('net');
var server  = require('./server');
var parser  = require('./parser');
var noop    = function() {};

var TIMEOUT = 15*1000;

var pools = {};
var onsocket = function(socket, fn) {
	socket.setTimeout(TIMEOUT, function() {
		socket.destroy();
	});
	socket.on('end', function() {
		socket.destroy();
	});
	socket.pipe(parser(fn));
};
var get = function(host) {
	if (pools[host]) return pools[host];

	var that = pools[host] = {};
	var socket = net.connect(parseInt(host.split(':')[1], 10), host.split(':')[0]);
	var onclose = function(err) {	
		delete pools[host];
		err = err || new Error('premature close');
		Object.keys(that.callbacks).forEach(function(id) {
			that.callbacks[id](err);
		});
		that.callbacks = {};
	};

	that.socket = socket;
	that.callbacks = {};
	that.start = 0;
	that.end = 0;
	socket.on('close', onclose);
	socket.on('error', onclose);
	onsocket(socket, function(message) { // Protocol: [ID,MSG,ERR?]
		var callback = that.callbacks[message[0]] || noop;
		var err = message[2] && new Error(message[2]);

		delete that.callbacks[message[0]];
		callback(err, err ? undefined : message[1]);
		if (++that.end !== that.start) return;
		delete pools[host];
		socket.destroy();
	});
	return that;
};
var request = function(host, message, callback) {
	var pool = get(host);

	message = [pool.start++,message];
	pool.callbacks[message[0]] = callback;
	pool.socket.write(JSON.stringify(message)+'\n');
};

request.listen = function(port, onbind) {
	if (typeof port === 'function') return request.listen(0, port);

	var that = server(port);

	that.on('connection', function(socket) {
		onsocket(socket, function(message) { // Protocol: [ID,MSG,ERR?]
			that.emit('request', message[1], function(err, res) {
				message[1] = res;
				if (err) message[2] = err.message;
				socket.write(JSON.stringify(message)+'\n');
			});
		});
	});
	if (onbind) {
		that.once('bind', onbind);
	}
	return that;
};

module.exports = request;