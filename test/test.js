var assert = require('assert'),
    xmlparser = require('./../index.js'),
    express = require('express'),
    request = require('supertest'),
    itemList = {list: {item: ['item1', 'item2', 'item3']}},
    itemsXML = '<list><item>item1</item><item>item2</item><item>item3</item></list>';

describe('XmlParserMiddleware', function () {

    describe('#testMime', function () {

        var regexp = xmlparser.regexp;

        it('should detect common XML mime-types', function () {

            assert.equal(true, regexp.test('text/xml'));
            assert.equal(true, regexp.test('application/xml'));
            assert.equal(true, regexp.test('application/rss+xml'));
            assert.equal(true, regexp.test('application/atom+xml'));
            assert.equal(true, regexp.test('application/vnd.google-earth.kml+xml'));
            assert.equal(true, regexp.test('application/xhtml+xml'));

        });

        it('should not interfere with other body parsers', function () {

            assert.equal(false, regexp.test('application/json'));
            assert.equal(false, regexp.test('application/x-www-form-urlencoded'));
            assert.equal(false, regexp.test('multipart/form-data'));

        });

    });

    describe('#testParser', function () {

        var app = express();

        app.use(xmlparser());
        app.post('/', function(req, res) {
            res.json(req.body);
        });

        it('should ignore empty request', function () {

            request(app)
              .post('/')
              .set('Content-Type', 'application/xml')
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual({}, res.body);
            });
        });

        it('should parse xml body', function () {

            request(app)
              .post('/')
              .set('Content-Type', 'application/vendor-spec+xml')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual(itemList, res.body);
              });
        });

    });

    describe('#customRegExp', function () {

        // get a fresh export instead of a reference to `xmlbodyparser`
        delete require.cache[require.resolve('../index.js')];

        var middleware = require('../index.js');
        var app = express();

        middleware.regexp = /custom\/mime/i;

        app.use(middleware);

        app.post('/', function(req, res) {
            res.json(req.body);
        });

        it('should permit overloading mime-type regular expression', function () {

            assert.notEqual(middleware, xmlparser.regexp);
            assert.equal(true, middleware.regexp.test('custom/mime'));
            assert.equal(false, middleware.regexp.test('application/xml'));

        });

        it('should ignore non-matching content-types', function () {

            request(app)
              .post('/')
              .set('Content-Type', 'application/xml')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual({}, res.body);
              });

        });

        it('should parse matching content-types', function () {

            request(app)
              .post('/')
              .set('Content-Type', 'custom/mime')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual(itemList, res.body);
              });

        });

    });

    describe('#routeMiddleware', function () {

        var app = express();

        app.post('/', function(req, res) {
            res.json(req.body);
        });
        app.post('/xml', xmlparser(), function(req, res) {
            res.json(req.body);
        });

        it('should not act as an app middleware', function () {

            request(app)
              .post('/')
              .set('Content-Type', 'application/xml')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual({}, res.body);
              });

        });

        it('should parse route xml request', function () {

            request(app)
              .post('/xml')
              .set('Content-Type', 'application/xml')
              .send(itemsXML)
              .expect(200)
              .end(function(err, res) {
                  if (err) throw err;
                  assert.deepEqual(itemList, res.body);
              });

        });

    });

});

