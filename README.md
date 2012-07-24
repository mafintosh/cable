# Cable

Cable is incredibly fast JSON requests over TCP in Node.js with pipelining support.  
It's available through npm:

	npm install cable

## Usage

Cable is especially useful for fast communication between processes and servers.
Usage is simple:

You can start a server:

``` js
var cable = require('cable');

var server = cable.listen(8080); // if you omit 8080 here you'll get a random port

server.on('request', function(message, callback) {
	// lets just echo
	callback(null, {echo:message});
});
server.ready(function(addr) {
	console.log('contact me here: '+addr);
});
```

Or do a request:

``` js
cable('localhost:8080', {hello:'world'}, function(err, message) {
	console.log(message);
});
```

To get an idea of the speed of cable you can try and run the [benchmark](https://github.com/mafintosh/cable/blob/master/bench.js)

## Pipelining

When you do a request `cable('localhost:8080',...)` cable opens up a TCP connection to the host and waits for the request to finish. If a new request is made to the same host in the meantime cable will just use the same TCP connection and pipeline the request minimizing latency. When all requests to a host are finished cable will close the connection to avoid tricky timeout issues.

## License

**This software is licensed under "MIT"**

> Copyright (c) 2012 Mathias Buus Madsen <mathiasbuus@gmail.com>
> 
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
> 
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
> 
> THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.