var net = require('net');
var cluster = require('cluster');
var rs = require('request-stream');
var address = require('network-address');

var noop = function() {};

var TIMEOUT = 15*1000;

var pools = {};

var listen = function(port) {
	var that = net.createServer();
	var bind;

	that.setMaxListeners(0);

	that.once('listening', function() {
		bind = address()+':'+that.address().port
		that.emit('bind', bind);
	});

	that.ready = function(fn) {
		if (bind) return fn(bind);
		that.once('bind', fn);
	};

	if (port || !cluster.isWorker) {
		that.listen(port);
	} else {
		var env = process.env;
		process.env = {};
		cluster.isWorker = false;
		that.listen(port);
		process.env = env;
		cluster.isWorker = true;
	}
	return that;
};
var get = function(host) {
	if (pools[host]) return pools[host];

	var socket = net.connect(parseInt(host.split(':')[1], 10), host.split(':')[0]);
	var r = pools[host] = pipe(socket);

	r.on('idle', function() {
		socket.end();
	});

	r.on('end', function() {
		delete pools[host];
	});

	return r;
};

var pipe = function(socket) {
	var r = rs();

	socket.setTimeout(TIMEOUT, function() {
		socket.destroy();
	});

	socket.on('error', noop);
	socket.on('end', function() {
		socket.end();
	});

	socket.pipe(r).pipe(socket);

	return r;
};

var request = function(host, message, callback) {
	get(host).request(message, callback);
};

request.listen = function(port, onbind) {
	if (typeof port === 'function') return request.listen(0, port);

	var that = listen(port);
	var onrequest = that.emit.bind(that, 'request');

	that.on('connection', function(socket) {
		pipe(socket).on('request', onrequest);
	});

	if (onbind) that.once('bind', onbind);

	return that;
};

module.exports = request;