var test = require('tap').test;
var cable = require('../index');

test('fire-and-forget message', function(t) {
	t.plan(2);

	var c = cable();

	c.once('message', function(message) {
		t.same(message.toString(), 'hello', 'message should be hello');
		c.once('message', function(message) {
			t.same(message.toString(), 'world');
		});
	});

	c.pipe(c);

	c.send('hello');
	c.send(new Buffer('world'));
});

test('request message', function(t) {
	t.plan(6);

	var c = cable();

	c.on('message', function(message, cb) {
		t.ok(true);
		cb(null, message);
	});

	c.pipe(c);

	c.send('hello', function(err, buf) {
		t.ok(!err);
		t.same(buf.toString(), 'hello');
	});

	c.send('world', function(err, buf) {
		t.ok(!err);
		t.same(buf.toString(), 'world');
	});
});

test('fire-and-forget + request', function(t) {
	t.plan(4);

	var c = cable();

	c.once('message', function(message) {
		t.same(message.toString(), 'hello');
		c.once('message', function(message, cb) {
			t.same(message.toString(), 'world');
			cb(null, message);
		});
	});

	c.pipe(c);

	c.send('hello');
	c.send('world', function(err, message) {
		t.ok(!err);
		t.same(message.toString(), 'world');
	});
});

test('empty message', function(t) {
	t.plan(1);

	var c = cable();

	c.on('message', function(message) {
		t.same(message.length, 0);
	});

	c.pipe(c);
	c.send(new Buffer(0));
});