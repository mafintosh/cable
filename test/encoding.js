var test = require('tap').test;
var cable = require('../index');

test('binary', function(t) {
	t.plan(2);

	var c = cable();

	c.on('message', function(message, cb) {
		t.ok(Buffer.isBuffer(message));
		cb(null, message);
	});

	c.pipe(c);

	c.send(new Buffer('hello'), function(err, buf) {
		t.ok(Buffer.isBuffer(buf));
	});
});

test('json', function(t) {
	t.plan(5);

	var c = cable({encoding:'json'});

	c.on('message', function(message, cb) {
		t.ok(typeof message === 'object');
		t.same(message.hello, 'world');
		t.same(message.number, 10);
		cb(null, {echo:message});
	});

	c.pipe(c);

	c.send({hello:'world', number:10}, function(err, message) {
		t.same(message.echo.hello, 'world');
		t.same(message.echo.number, 10);
	});
});

test('json+error', function(t) {
	t.plan(2);

	var c = cable({encoding:'json'});

	c.on('message', function(message, cb) {
		cb(new Error('error'));
	});

	c.pipe(c);

	c.send({hello:'world', number:10}, function(err) {
		t.ok(err);
		t.same(err.message, 'error');
	});
});

test('utf-8', function(t) {
	t.plan(3);

	var c = cable({encoding:'json'});

	c.on('message', function(message, cb) {
		t.ok(typeof message === 'string');
		t.same(message, 'hello wårld');
		cb(null, 'echo: '+message);
	});

	c.pipe(c);

	c.send('hello wårld', function(err, message) {
		t.same(message, 'echo: hello wårld');
	});
});