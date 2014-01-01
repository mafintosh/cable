var stream = require('stream');
var util = require('util');

var noop = function() {};

var empty = new Buffer(0);

var i = 0;
var pool = new Buffer(7168);
var alloc = function() {
	if (pool.length === i) {
		pool = new Buffer(7168);
		i = 0;
	}
	return pool.slice(i, i+=7);
};

var Cable = function(opts) {
	if (!(this instanceof Cable)) return new Cable(opts);
	if (!opts) opts = {};

	stream.Duplex.call(this);

	this._destroyed = false;
	this._ended = false;
	this._encoding = opts.encoding || null;
	this._buffer = new stream.PassThrough();

	this._header = true;
	this._length = 7;
	this._type = 0;
	this._id = 0;

	this._freelist = [];
	this._map = [];
	this._top = 0;

	this.on('finish', this._onfinish);
};

util.inherits(Cable, stream.Duplex);

Cable.prototype.send = function(message, cb) {
	if (cb) this._encodecb(message, cb);
	else this._encode(0, 0, message);
};

Cable.prototype.ping = function(cb) {
	this._encodecb(empty, cb || noop);
};

Cable.prototype.destroy = function() {
	if (this._destroyed) return;
	this._destroyed = true;
	this.emit('close');
	this.end();
};

Cable.prototype._write = function(data, enc, cb) {
	this._buffer.write(data);

	var buf;

	while (buf = this._buffer.read(this._length)) {
		if (this._header) {
			this._header = false;
			this._type = buf[0];
			this._id = buf.readUInt16LE(1);
			this._length = buf.readUInt32LE(3);
			if (this._length) continue;
			buf = empty;
		}

		this._length = 7;
		this._header = true;

		if (!buf.length && this._type === 1) {
			this.emit('ping');
			this._encode(2, this._id, empty);
			continue;
		}

		switch (this._type) {
			case 0:
			this.emit('message', this._decode(buf), noop);
			break;
			case 1:
			this.emit('message', this._decode(buf), this._callback(this._id));
			break;
			case 2:
			this._decodecb(this._id)(null, this._decode(buf));
			break;
			case 3:
			this._decodecb(this._id)(new Error(buf.toString()));
			break;
		}
	}

	cb();
};

Cable.prototype._callback = function(id) {
	var self = this;
	return function(err, message) {
		if (err) return self._encode(3, id, new Buffer(err.message));
		else self._encode(2, id, message);
	};
};

Cable.prototype._read = function() {
	// do nothing...
};

Cable.prototype._decode = function(buf) {
	if (!buf.length) return null;

	switch (this._encoding) {
		case 'json':
		try {
			return JSON.parse(buf.toString());
		} catch (err) {
			return null;
		}
		case 'utf-8':
		case 'utf8':
		return buf.toString();
		default:
		return buf;
		break;
	}
};

Cable.prototype._decodecb = function(id) {
	var cb = this._map[id];
	this._map[id] = null;
	this._freelist.push(id);
	return cb || noop;
};

Cable.prototype._encodecb = function(message, cb) {
	var id = this._freelist.length ? this._freelist.pop() : this._top++;
	if (id > 65535) return cb(new Error('stack overflow'));

	// help v8 and do not trigger oob
	if (id === this._map.length) this._map.push(cb);
	else this._map[id] = cb;

	this._encode(1, id, message);
};

Cable.prototype._encode = function(type, id, message) {
	if (message === undefined || message === null || message === '') message = empty;
	if (!Buffer.isBuffer(message)) message = new Buffer(this._encoding === 'json' ? JSON.stringify(message) : message);

	var header = alloc();
	header[0] = type;
	header.writeUInt16LE(id, 1);
	header.writeUInt32LE(message.length, 3);

	if (this._ended) return;

	this.push(header);
	if (message.length) this.push(message);
};

Cable.prototype._onfinish = function() {
	this._ended = true;
	this.push(null);

	var missing = this._top - this._freelist.length;
	if (!missing) return;

	for (var i = 0; i < this._top; i++) {
		if (this._map[i]) {
			this._map[i](new Error('cable was destroyed'));
			if (!--missing) return;
		}
	}

};

module.exports = Cable;