var Parser = function() {
	var self = this;

	this.writable = true;
	this.buffer = '';
	this.once('pipe', function(from) {
		from.setEncoding('utf-8');
		self.on('error', function() {
			from.destroy();
		});
	});
};

Parser.prototype.__proto__ = process.EventEmitter.prototype;
Parser.prototype.write = function(data) {
	var messages = (this.buffer+data).split('\n');

	this.buffer = messages[messages.length-1];
	for (var i = 0; i < messages.length-1; i++) {
		var message;

		try {
			message = JSON.parse(messages[i]);
		} catch (err) {
			this.emit('error', err);
			return;
		}
		this.emit('message', message);
	}
};
Parser.prototype.end = Parser.prototype.destroy = function() {
	if (!this.writable) return;
	this.writable = false;
	this.emit('end');
};

module.exports = function(fn) {
	var parser = new Parser();

	if (fn) {
		parser.on('message', fn);
	}
	return parser;
};