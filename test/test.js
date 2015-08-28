var assert = require('assert');
var xmlparser = require('./../index.js');
var express = require('express');
var request = require('supertest');
var itemList = {
  list: {
    item: [
      'item1', 'item2', 'item3'
    ]
  }
};
var itemsXML = '<list><item>item1</item><item>item2</item><item>item3</item></list>';

describe('XmlParserMiddleware', function () {

  describe('#testMime', function () {

    var regexp = xmlparser.regexp;

    it('should detect common XML mime-types', function () {
      assert.equal(regexp.test('text/xml'), true);
      assert.equal(regexp.test('application/xml'), true);
      assert.equal(regexp.test('application/rss+xml'), true);
      assert.equal(regexp.test('application/atom+xml'), true);
      assert.equal(regexp.test('application/vnd.google-earth.kml+xml'), true);
      assert.equal(regexp.test('application/xhtml+xml'), true);
    });

    it('should not interfere with other body parsers', function () {
      assert.equal(regexp.test('application/json'), false);
      assert.equal(regexp.test('application/x-www-form-urlencoded'), false);
      assert.equal(regexp.test('multipart/form-data'), false);
    });

  });

  describe('#testMiddleware', function () {

    var app = express();

    app.use(xmlparser());

    app.get('/', function (req, res) {
      res.json(req.body);
    });

    app.post('/', function (req, res) {
      res.json(req.body);
    });

    it('should not run if there is no request-body', function (done) {
      request(app)
        .get('/')
        .expect(200, '{}', done);
    });

    it('should not run if there no Content-Type header', function (done) {
      request(app)
        .post('/')
        .send(itemsXML)
        .expect(200, '{}', done);
    });

    it('should not run on empty Content-Type header', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', '')
        .set('Transfer-Encoding', '')
        .expect(200, function(err, res) {
          assert.deepEqual(res.body, {});
          done();
        });
    });

    it('should throw 411 on fake Transfer-Encoding header', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .set('Transfer-Encoding', '')
        .expect(411, done);

    });

    it('should throw 411 on fake Content-Length header', function (done) {
      request(app).post('/')
        .set('Content-Type', 'application/xml')
        .set('Content-Length', '')
        .expect(411, done);
    });

    it('should throw 411 on empty request body', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send('   ')
        .expect(411, done);
    });

    it('should throw 400 on unclosed root tag', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/vendor-spec+xml')
        .send('<xml>this is invalid')
        .expect(400, done);
    });

    it('should throw 400 on invalid char before root tag', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/vendor-spec+xml')
        .send('"<xml>ok</xml>')
        .expect(400, done);
    });

    it('should throw 400 on unexpected end', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/vendor-spec+xml')
        .send('<xml>><')
        .expect(400, done);
    });

    it('should send 200 on empty xml root tag', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send('<xml></xml>')
        .expect(200, function (err, res) {
          assert.deepEqual(res.body, {
            xml: ''
          });
          done();
        });
    });

    it('should parse xml body', function () {
      request(app)
        .post('/')
        .set('Content-Type', 'application/vendor-spec+xml')
        .send(itemsXML)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          assert.deepEqual(itemList, res.body);
        });
    });

    it('should throw 400 on invalid xml body', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/vendor-spec+xml')
        .send('<xml>this is invalid')
        .expect(400, done);
    });

    it('should throw 400 on invalid xml body', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/vendor-spec+xml')
        .send('<xml><>')
        .expect(400, done);
    });

  });

  describe('#testOtherBodyParser', function () {

    var app = express();
    app.use(function fakeMiddleware(req, res, next) {
      // simulate previous bodyparser by setting req._body = true
      req._body = true;
      req.body = 'fake data';
      next();
    });
    app.use(xmlparser());
    app.post('/', function (req, res) {
      res.json(req.body);
    });

    it('should not parse body if other bodyparser ran before', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(itemsXML)
        .expect(200, '"fake data"', done);
    });

  });

  describe('#testCustomRegExp', function () {

    // get a fresh export instead of a reference to `xmlbodyparser`
    delete require.cache[require.resolve('../index.js')];

    var middleware = require('../index.js');
    var app = express();

    middleware.regexp = /custom\/mime/i;

    app.use(middleware);

    app.post('/', function (req, res) {
      res.json(req.body);
    });

    it('should permit overloading mime-type regular expression', function () {
      assert.notEqual(middleware, xmlparser.regexp);
      assert.equal(middleware.regexp.test('custom/mime'), true);
      assert.equal(middleware.regexp.test('application/xml'), false);
    });

    it('should ignore non-matching content-types', function () {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(itemsXML)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          assert.deepEqual(res.body, {});
        });
    });

    it('should parse matching content-types', function () {
      request(app)
        .post('/')
        .set('Content-Type', 'custom/mime')
        .send(itemsXML)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          assert.deepEqual(res.body, itemList);
        });
    });

  });

  describe('#testRouteMiddleware', function () {
    var app = express();

    app.post('/', function (req, res) {
      res.json(req.body);
    });

    app.post('/xml', xmlparser(), function (req, res) {
      res.json(req.body);
    });

    it('should not act as an app middleware', function () {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(itemsXML)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          assert.deepEqual(res.body, {});
        });
    });

    it('should parse route xml request', function () {
      request(app)
        .post('/xml')
        .set('Content-Type', 'application/xml')
        .send(itemsXML)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            throw err;
          }
          assert.deepEqual(res.body, itemList);
        });
    });

  });

  describe('#testParserOptions', function() {

    var app;
    var responder = function (req, res) {
      res.json(req.body);
    };
    var xml = '<UPPERCASE aTTr="mixed">  TRIMM   </UPPERCASE>';
    var list = '<ITEMs><item attr="one"/><item attr="two"/></ITEMs>';

    beforeEach(function() {
      app = express();
    });

    it('should normalize xml data by default', function (done) {
      app.post('/', xmlparser(), responder);

      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(xml)
        .expect(200, function (err, res) {
          assert.equal(err, null);
          assert.deepEqual(res.body, { uppercase: { _: 'TRIMM', '$': { aTTr: 'mixed' } } });
          done();
        });
    });

    it('should merge custom options', function (done) {
      app.post('/', xmlparser({normalize: false, normalizeTags: false, trim: false}), responder);

      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(xml)
        .expect(200, function (err, res) {
          assert.equal(err, null);
          assert.deepEqual(res.body, { UPPERCASE: { _: '  TRIMM   ', '$': { aTTr: 'mixed' } } });
          done();
        });

    });

    it('should merge self-closing tags with same name', function (done) {
      app.post('/', xmlparser(), responder);

      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(list)
        .expect(200, function (err, res) {
          assert.equal(err, null);
          assert.deepEqual(res.body, {
            items: {
              item: [
                {
                  $: {
                    attr: 'one'
                  }
                },
                {
                  $: {
                    attr: 'two'
                  }
                }
              ]
            }});
          done();
        });
    });

  });

});
