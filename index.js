var stream = require('stream');
var util = require('util');

var noop = function() {};

var encode = function(type, id, message) {
	var str = JSON.stringify(message === undefined ? null : message);
	var len = Buffer.byteLength(str);
	var buf = new Buffer(7+len);

	buf[0] = type;
	buf.writeUInt16LE(id, 1);
	buf.writeUInt32LE(len, 3);
	buf.write(str, 7);

	return buf;
};

var Cable = function(opts) {
	if (!(this instanceof Cable)) return new Cable(opts);

	stream.Duplex.call(this, opts);

	this._stack = [];
	this._freelist = [];
	this._pointer = 0;

	this._buffer = new stream.PassThrough();
	this._message = false;
	this._length = 7;
	this._type = 0;
	this._id = 0;

	this._destroyed = false;

	this.on('finish', this._onfinish);
};

util.inherits(Cable, stream.Duplex);

Cable.prototype._write = function(buf, enc, cb) {
	this._buffer.write(buf);

	var data;

	while (data = this._buffer.read(this._length)) {
		if (!this._message) {
			this._type = data[0];
			this._id = data.readUInt16LE(1);
			this._length = data.readUInt32LE(3);
			this._message = true;
			continue;
		}

		this._message = false;
		this._length = 7;

		var message;

		try {
			message = JSON.parse(data.toString());
		} catch (err) {
			continue;
		}

		switch (this._type) {
			case 0:
			this.emit('message', message, noop);
			break;
			case 1:
			this.emit('message', message, this._callback(this._id));
			break;
			case 2:
			this._free(this._id)(null, message);
			break;
			case 3:
			this._free(this._id)(new Error(message));
			break;
			case 4:
			this.emit('ping');
			this.push(encode(2, this._id, 'pong'));
			break;
		}
	}

	cb();
};

Cable.prototype.ping = function(cb) {
	this._send(4, 'ping', cb || noop);
};

Cable.prototype.send = function(message, cb) {
	if (cb) return this._send(1, message, cb);
	this.push(encode(0, 0, message));
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

Cable.prototype._send = function(type, message, cb) {
	var id = this._freelist.length ? this._freelist.pop() : this._pointer++;
	if (id > 65535) return cb(new Error('stack overflow'));

	// help v8 and do not trigger oob
	if (id === this._stack.length) this._stack.push(cb);
	else this._stack[id] = cb;

	this.push(encode(type, id, message));
};

Cable.prototype._free = function(id) {
	var cb = this._stack[id];
	this._stack[id] = null;
	this._freelist.push(id);
	return cb || noop;
};

Cable.prototype._callback = function(id) {
	var self = this;
	return function(err, message) {
		self.push(err ? encode(3, id, err.message) : encode(2, id, message));
	};
};

Cable.prototype._onfinish = function() {
	var missing = this._pointer - this._freelist.length;
	if (!missing) return;

	for (var i = 0; i < this._pointer; i++) {
		if (this._stack[i]) {
			this._stack[i](new Error('stream has ended'));
			if (!--missing) return;
		}
	}
};

module.exports = Cable;