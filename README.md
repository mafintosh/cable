# Cable

Cable is incredibly fast binary encoded JSON requests over a stream in Node.js with pipelining support.
It's available through npm:

	npm install cable

## Usage

Cable is especially useful for fast communication between processes and servers. All JSON messages
are sent with a 5 byte header that descripes the type and length of a message. This allows for extremely
easy and fast parsing.

Usage is simple. Start a server:

``` js
var net = require('net');
var cable = require('cable');

var server = net.createServer(function(socket) {
	var c = cable();

	c.on('message', function(message, callback) {
		// lets just echo
		callback(null, {echo:message});
	});

	socket.pipe(c).pipe(socket); // setup the pipe chain
});

server.listen(8080);
```

Do a request:

``` js
var socket = net.connect(8080);
var c = cable();

socket.pipe(c).pipe(socket);

c.send({hello:'world'}, function(err, message) {
	console.log(message); // prints echo
});

c.send({hello:'verden'}, function(err, message) {
	console.log(message); // prints echo again
});
```

## Pipelining

When you do a request `c.send(message, [cb])` cable sends the message and pushes the callback to a response stack. If a new request is made to the same stream in the meantime cable will just send that right away and pipeline the request to minimize latency. Omit the callback to not wait for a response.

## Full API

* `cable() -> c` instantiate a new cable duplex stream

* `c.send(message, [cb])` send a message. add the callback if you want a response

* `c.on('message', message, cb)` emitted when a message is received. `cb` is noop if no callback was used in `send`

* `c.destroy()` destroy the stream. calls all missing callbacks with an error

## License

MIT