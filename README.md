[![NPM Version][npm-image]][npm-url]
[![Dependency Status][deps-image]][deps-url]
[![Build Status][ci-image]][ci-url]
[![Code Coverage status][codecov-image]][codecov-url]

# express-xml-bodyparser

For those rare cases when you have to parse incoming raw xml-body requests. This middleware works with any connect- or express-based nodejs application. 

## Description

Admittedly, having to deal with XML data has become less common in recent years. Still, there are services and APIs using this format. The middleware is based on the [connect-json middleware](http://www.senchalabs.org/connect/json.html) as a blueprint.

There is a [similar xml bodyparser](https://github.com/falsecz/connect-xml-bodyparser) module available, but you might appreciate some notable differences:

* Custom configuration options how to deal with XML data.
* Attempt to parse data only once, even if middleware is called multiple times.
* Skip data parsing immediately if no req-body has been sent.
* Accept any XML-based content-type, e.g. `application/rss+xml`
* No dependency on coffeescript keeping dependencies to a minimum.

## Installation 

Utilize [npm](http://npmjs.org/) by typing `npm install express-xml-bodyparser --save` in your projects root folder and your good to go. 

## Configuration 

You can pass configuration options into the XML parser middleware. They're exactly the same options you would use for [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js), which this middleware relies on. For further details look at all [available configuration options](https://github.com/Leonidas-from-XIV/node-xml2js#options).

**IMPORTANT:** Currently, it is not advisable to operate xml2js in `async=true` mode. Unless you can absolutely trust input data (which you should not), certain types of invalid XML will throw uncaught exceptions.
See https://github.com/Leonidas-from-XIV/node-xml2js/issues/232 for progress on this issue. Until then, the default option is set to `async=false`.

Without specifying custom options, the middleware applies some opionated defaults meant to normalize the resulting json object properties. All whitespace in text nodes will be trimmed, property and tag names will be lowercased. The parser will always return node lists explicitly cast to Array.

**NOTE:** Custom options will be merged with aforementioned opionated defaults, so in case you want to use `xml2js` defaults, you will have to specify the following:

````javascript
var xml2jsDefaults = {
    explicitArray: false,
    normalize: false,
    normalizeTags: false,
    trim: true
}
````

This change appeared in v0.1.0, older versions would merge options against `xml2js`'s default options.

## Usage 

You can either use express-xml-bodyparser at application level, or for specific routes only. 

Here is an example of an express application with default settings:

````javascript
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

````javascript
app.post('/receive-xml', xmlparser({trim: false, explicitArray: false}), function(req, res, next) {
  // check req.body  
});
````

Above example demonstrates how to pass custom options to the XML parser. 

## Customize mime-type detection

If you want to customize the regular expression that checks whether the xmlparser should do its work or not, 
you can provide your own by overloading the `xmlparser.regexp` property, like so: 

````javascript
var xmlparser = require('express-xml-bodyparser');
xmlparser.regexp = /^text\/xml$/i;
````

Doing so, will allow you to restrict XML parsing to custom mime-types only. Thanks to [@ophentis](https://github.com/ophentis) for the suggestion.
Just make sure your regular expression actually matches mime-types you're interested in.
The feature is available since version v0.0.5.

**IMPORTANT** In versions v0.2.x custom regular expressions were ignored in mime-type parsing. The issue has been fixed in v0.3.0. If you need/rely on this feature, please upgrade to a newer version. Many thanks to [@dirksen](https://github.com/dirksen) who discovered this issue.

## Roadmap to v1.0.0

Lets start a discussion how to get to there (stable API).

Here are some thoughts:

* 100% align with [body-parser](https://github.com/expressjs/body-parser)'s error and success handling when dealing with `req.body` and `req.rawBody`.
* Possibly dropping support for [connect](https://github.com/senchalabs/connect) altogether at one point?
* Deprecate mutating the `xmlparser` middleware's mime-type regexp in favor of passing customizations into the options parameters (perfect if using route-middlewares).
* Refactor to use node's StreamAPIv2 (in effect requiring nodejs >= v0.10.x).
* Require [raw-body](https://github.com/stream-utils/raw-body) with added benefits of limiting request body size and setting charset-encoding based on request data.
* ~~Provide functional tests incorporating (a~~ny~~ version of) [express](http://expressjs.com/).~~

[npm-image]:https://img.shields.io/npm/v/express-xml-bodyparser.svg?style=flat
[npm-url]:https://www.npmjs.com/package/express-xml-bodyparser
[deps-image]:https://david-dm.org/macedigital/express-xml-bodyparser.svg
[deps-url]:https://david-dm.org/macedigital/express-xml-bodyparser
[ci-image]: https://travis-ci.org/macedigital/express-xml-bodyparser.svg?style=flat
[ci-url]: https://travis-ci.org/macedigital/express-xml-bodyparser
[codecov-image]:https://img.shields.io/codecov/c/github/macedigital/express-xml-bodyparser.svg?style=flat
[codecov-url]:https://codecov.io/github/macedigital/express-xml-bodyparser
