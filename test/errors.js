var test = require('tap').test;
var cable = require('../index');

test('cb error', function(t) {
	t.plan(2);

	var c = cable();

	c.on('message', function(message, cb) {
		cb(new Error('error message'));
	});

	c.pipe(c);

	c.send('hello', function(err) {
		t.ok(err);
		t.same(err.message, 'error message');
	});
});

test('end stream error', function(t) {
	t.plan(2);

	var c = cable();

	c.pipe(c);

	c.send('hello', function(err) {
		t.ok(err);
	});

	c.send('world', function(err) {
		t.ok(err);
	});

	c.end();
});

test('destroy stream error', function(t) {
	t.plan(2);

	var c = cable();

	c.pipe(c);

	c.send('hello', function(err) {
		t.ok(err);
	});

	c.send('world', function(err) {
		t.ok(err);
	});

	c.destroy();
});

test('ping error', function(t) {
	t.plan(1);

	var c = cable();

	c.pipe(c);

	c.ping(function(err) {
		t.ok(err);
	});

	c.destroy();
});