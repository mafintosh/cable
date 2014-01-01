var test = require('tap').test;
var cable = require('../index');

test('ping', function(t) {
	t.plan(2);

	var c = cable();

	c.pipe(c);

	c.on('message', function() {
		t.ok(false);
	});

	c.once('ping', function() {
		t.ok(true);
	});

	c.ping(function(err) {
		t.ok(!err);
	});
});