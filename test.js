var assert = require('assert');
var cable = require('./index');

var messages = [1,2,3,4,5];
var recv = 0;
var sent = 0;
var c = cable({encoding:'json'});

c.on('message', function(message, cb) {
	assert(message === messages[recv++]);
	cb(null, {echo:message});
});

messages.forEach(function(m) {
	c.send(m, function(err, message) {
		assert(!err);
		assert(message.echo === m);
		sent++;
	});
});

c.pipe(c);

setTimeout(function() {
	assert(recv === messages.length);
	assert(sent === recv);
}, 250);