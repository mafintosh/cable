var stream = require('stream');
var util = require('util');
var fifo = require('fifo');

var noop = function() {};

var encode = function(dir, message) {
	var str = JSON.stringify(message === undefined ? null : message);
	var len = Buffer.byteLength(str);
	var buf = new Buffer(5+len);

	buf.writeUInt32LE(len, 0);
	buf[4] = dir;
	buf.write(str, 5);

	return buf;
};

var Cable = function(opts) {
	if (!(this instanceof Cable)) return new Cable(opts);

	stream.Duplex.call(this, opts);

	this._incoming = fifo();
	this._outgoing = fifo();
	this._buffer = new stream.PassThrough();
	this._length = 5;
	this._message = false;
	this._direction = 0;
	this._destroyed = false;

	this.on('finish', this._onfinish);
};

util.inherits(Cable, stream.Duplex);

Cable.prototype._write = function(buf, enc, cb) {
	this._buffer.write(buf);

	var data;

	while (data = this._buffer.read(this._length)) {
		if (!this._message) {
			this._direction = data[4];
			this._message = true;
			this._length = data.readUInt32LE(0);
			continue;
		}

		this._message = false;
		this._length = 5;

		var message;

		try {
			message = JSON.parse(data.toString());
		} catch (err) {
			continue;
		}

		switch (this._direction) {
			case 0:
			this.emit('message', message, noop);
			break;
			case 1:
			this.emit('message', message, this._callback());
			break;
			case 2:
			(this._incoming.shift() || noop)(null, message);
			break;
			case 3:
			(this._incoming.shift() || noop)(new Error(message));
			break;
			case 4:
			this.emit('ping');
			this._outgoing.push(encode(2, 'pong'));
			this._drain();
			break;
		}
	}

	cb();
};

Cable.prototype.ping = function(cb) {
	this.push(encode(4, 'ping'));
	this._incoming.push(cb || noop);
};

Cable.prototype.send = function(message, cb) {
	if (cb) {
		this.push(encode(1, message));
		this._incoming.push(cb);
	} else {
		this.push(encode(0, message));
	}
};

Cable.prototype.destroy = function() {
	if (this._destroyed) return;
	this._destroyed = true;
	this.emit('close');
	this.end();
};

Cable.prototype._read = function() {
	// do nothing...
};

Cable.prototype._callback = function() {
	var self = this;
	var node = this._outgoing.push(null);

	return function(err, message) {
		self._outgoing.set(node, err ? encode(3, err.message) : encode(2, message));
		self._drain();
	};
};

Cable.prototype._drain = function() {
	while (this._outgoing.first()) this.push(this._outgoing.shift());
};

Cable.prototype._onfinish = function() {
	while (this._incoming.length) this._incoming.shift()(new Error('stream has ended'));
};

module.exports = Cable;