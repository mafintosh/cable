# Cable

Cable is a fast and simple binary request/response protocol over a binary stream in Node.js with pipelining support.
It's available through npm:

	npm install cable

## Usage

Cable is especially useful for fast communication between processes and servers. All messages
are sent with a 7 byte header that descripes the id and length of a message. This allows for extremely
easy and fast parsing.

Usage is simple. Start a server:

``` js
var net = require('net');
var cable = require('cable');

var server = net.createServer(function(socket) {
	var c = cable();

	c.on('message', function(message, callback) {
		// lets just echo
		callback(null, message);
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

c.send(new Buffer('hello'), function(err, message) {
	console.log(message); // prints 'hello' as a buffer
});

c.send(new Buffer('world'), function(err, message) {
	console.log(message); // prints 'world' as a buffer
});
```

To send JSON either encode/decode the messages yourself or use the encoding option

``` js
var c = cable({encoding:'json'});

s.send({hello:'world'}, function(err, doc) {
	console.log(doc); // doc will also be JSON
});
```

## Pipelining

When you do a request `c.send(message, [cb])` cable sends the message and remembers the callback. If a new request is made to the same stream in the meantime cable will just send that right away and pipeline the request to minimize latency. If you do not care about the response then don't pass a callback.

## Full API

* `cable({encoding:null|json|utf-8}) -> c` instantiate a new cable duplex stream. select an optional message encoding

* `c.send(message, [cb])` send a message. add the callback if you want a response

* `c.on('message', message, cb)` emitted when a message is received. `cb` is noop if no callback was used in `send`

* `c.destroy()` destroy the stream. calls all missing callbacks with an error

* `c.ping(cb)` send a ping. useful to check if the connection is still alive

## Protocol

All messages are prefixed with the following header and looks like this

```
 ----------------------------------------------------------------------------------
|  1 byte type  |  16 byte message id  |  32 byte uint message length  |  message  |
 ----------------------------------------------------------------------------------
```

The type byte can be:

* `0` this message does not expect a response
* `1` this message expects a response with the same id
* `2` this is a response to the message with same id
* `3` this message is an error response to the message with the same id (message body is a utf-8 encoding error message)

Message ids should be safe to reuse after a response has been received.

## License

MIT
