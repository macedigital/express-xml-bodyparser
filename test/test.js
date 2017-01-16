/*global describe, beforeEach, before, after, it*/
'use strict';

var assert = require('assert');
var xmlparser = require('./../index.js');
var express = require('express');
var request = require('supertest');
var originalRegexp = xmlparser.regexp;

describe('XmlParserMiddleware', function () {
  
  var app;
  var itemList = {
    list: {
      item: [
        'item1', 'item2', 'item3'
      ]
    }
  };
  var itemsXML = '<list><item>item1</item><item>item2</item><item>item3</item></list>';
  var responder = function (req, res) {
    res.json(req.body);
  };

  beforeEach(function () {
    app = express();
  });
  
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
      assert.equal(regexp.test(''), false);
    });

  });

  describe('#testMiddleware', function () {
    
    beforeEach(function () {
      app.use(xmlparser());
      app.get('/', responder);
      app.post('/', responder);
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
        .expect(200, function (err, res) {
          if (err) {
            return done(err);
          }
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

    it('should throw 400 on non-XML', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send('"johnny b. goode"')
        .expect(400, done);
    });

    it('should send 200 on empty xml root tag', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send('<xml></xml>')
        .expect(200, function (err, res) {
          if (err) {
            return done(err);
          }
          assert.deepEqual(res.body, {
            xml: ''
          });
          done();
        });
    });

    it('should parse xml body', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/vendor-spec+xml')
        .send(itemsXML)
        .expect(200, function (err, res) {
          if (err) {
            return done(err);
          }
          assert.deepEqual(itemList, res.body);
          done();
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

    beforeEach(function () {
      app.use(function fakeMiddleware(req, res, next) {
        // simulate previous bodyparser by setting req._body = true
        req._body = true;
        req.body = 'fake data';
        next();
      });
      app.use(xmlparser());
      app.post('/', responder);
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

    var customMimeRegexp = /custom\/mime/i;

    before(function () {
      xmlparser.regexp = customMimeRegexp;
    });

    after(function () {
      xmlparser.regexp = originalRegexp;
    });

    beforeEach(function () {
      app.use(xmlparser());
      app.post('/', responder);
    });
    
    it('should permit overloading mime-type regular expression', function () {
      assert.notEqual(originalRegexp, xmlparser.regexp);
      assert.equal(xmlparser.regexp.test('custom/mime'), true);
      assert.equal(xmlparser.regexp.test('application/xml'), false);
    });

    it('should ignore non-matching content-types', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(itemsXML)
        .expect(200, function (err, res) {
          if (err) {
            return done(err);
          }
          assert.deepEqual(res.body, {});
          done();
        });
    });

    it('should parse matching content-types', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'custom/mime')
        .send(itemsXML)
        .expect(200, function (err, res) {
          if (err) {
            return done(err);
          }
          assert.deepEqual(res.body, itemList);
          done();
        });
    });

  });

  describe('#testRouteMiddleware', function () {
    
    beforeEach(function () {
      app.post('/', function (req, res) {
        assert.equal(req.rawBody, undefined);
        res.json(req.body);
      });
      app.post('/xml', xmlparser(), function (req, res) {
        assert.equal(req.rawBody, itemsXML);
        res.json(req.body);
      });
    });

    it('should not act as an app middleware', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(itemsXML)
        .expect(200, function (err, res) {
          if (err) {
            return done(err);
          }
          assert.equal(res.body, '');
          done();
        });
    });

    it('should parse route xml request', function (done) {
      request(app)
        .post('/xml')
        .set('Content-Type', 'application/xml')
        .send(itemsXML)
        .expect(200, function (err, res) {
          if (err) {
            return done(err);
          }
          assert.deepEqual(res.body, itemList);
          done();
        });
    });

  });

  describe('#when configured with no explicit array and non-normalized tagnames', function () {
    var inputXml;
    var expectedJson;
    
    beforeEach(function () {
      app.use(xmlparser({
        explicitArray: false,
        normalizeTags: false
      }));
      app.post('/', responder);
      inputXml = '<?xml version="1.0" encoding="UTF-8" ?>\n<error>\n\t<message>\n\t\t<test>     test </test>\n\t</message>\n\t<errorCode>12</errorCode>\n</error>';
      expectedJson = {
        error: {
          message: {
            test: 'test'
          },
          errorCode: '12' // numbers will be converted to string
        }
      }
    });

    it('should extract children as simple object with same keys as input', function (done) {
      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(inputXml)
        .expect(200, function (err, res) {
          if (err) {
            return done(err);
          }
          assert.deepEqual(res.body, expectedJson);
          done();
        });
    });
        
  });
  
  describe('#testParserOptions', function () {
    
    var xml = '<UPPERCASE aTTr="mixed">  TRIMM   </UPPERCASE>';
    var list = '<ITEMs><item attr="one"/><item attr="two"/></ITEMs>';

    it('should normalize xml data by default', function (done) {
      app.post('/', xmlparser(), responder);

      request(app)
        .post('/')
        .set('Content-Type', 'application/xml')
        .send(xml)
        .expect(200, function (err, res) {
          if (err) {
            return done(err);
          }
          assert.deepEqual(res.body, {uppercase: {_: 'TRIMM', '$': {aTTr: 'mixed'}}});
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
          if (err) {
            return done(err);
          }
          assert.deepEqual(res.body, {UPPERCASE: {_: '  TRIMM   ', '$': {aTTr: 'mixed'}}});
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
          if (err) {
            return done(err);
          }
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
            }
          });
          done();
        });
    });

  });

});
