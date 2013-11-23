# express-xml-bodyparser

For those rare cases when you have to parse incoming raw xml-body requests. This middleware works with any connect- or express-based nodejs application. 

## Description

Admittedly, having to deal with XML data has become less common in recent years. Still, there are services and APIs using this format. The middleware is based on the [connect-json middleware](http://www.senchalabs.org/connect/json.html) as a blueprint.

There is a [similar xml bodyparser](https://github.com/falsecz/connect-xml-bodyparser) module available, but you might appreciate some notable differences:

* Custom configuration options how to deal with xml data.
* Attempt to parse data only once, even if middleware is called multiple times.
* Skip data parsing immediately if no req-body has been sent.
* Accept any XML-based content-type, e.g. `application/rss+xml`
* No dependency on coffeescript keeping dependencies to a minimum.


## Installation 

Utilize [npm](http://npmjs.org/) by typing `npm install express-xml-bodyparser --save` in your projects root folder and your good to go. 

## Configuration 

You can pass configuration options into the xml parser middleware. They're exactly the same options you would use for [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js), which this middleware relies on. For further details look at all [available configuration options](https://github.com/Leonidas-from-XIV/node-xml2js#options).

Without specifying custom options, the middleware applies some opionated defaults meant to normalize the resulting json object properties. All whitespace in text nodes will be trimmed, property and tag names will be lowercased. The parser operates in `async` mode and will always return node lists explicitly cast to Array.

## Usage 

You can either use express-xml-bodyparser at application level, or for specific routes only. 

Here is an example of an express application with default settings:

````
var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    xmlparser = require('express-xml-bodyparser');

// .. other middleware ... 
app.use(express.json());
app.use(express.urlencoded());
app.use(xmlparser());
// ... other middleware ... 

app.post('/receive-xml', function(req, res, next) {

  // req.body contains the parsed xml

});

server.listen(1337);

````

If you wanted to use express-xml-bodyparser for specific routes only, you would do something like this:

````
app.post('/receive-xml', xmlparser({trim: false, explicitArray: false}), function(req, res, next) {
  // check req.body  
});
````

Above example demonstrates how to pass custom options to the xml parser. 


