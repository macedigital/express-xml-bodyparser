var assert = require('assert'),
    xmlparser = require('./../index.js');

describe('XmlParserMiddleware', function () {

    describe('#testMime', function () {

        var regexp = /^application\/([\w!#\$%&\*`\-\.\^~]*\+)?xml$/i;

        it('should detect common XML mime-types', function () {

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

});

