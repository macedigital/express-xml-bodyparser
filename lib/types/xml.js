/**
 * Module dependencies.
 */

var xml2js = require('xml2js');
var http = require('http');
var regexp = /^(text\/xml|application\/([\w!#\$%&\*`\-\.\^~]+\+)?xml)$/i;
var util = require('util');

/**
 * Module exports.
 */

module.exports = xmlparser;
module.exports.regexp = regexp;

/**
 * Expose configuration for xml-bodyparser middleware
 *
 * @api public
 * @param {Object} options Parser options
 * @return {xmlbodyparser}
 */

function xmlparser(options) {

  var parserOptions = util._extend({
      async: false,
      explicitArray: true,
      normalize: true,
      normalizeTags: true,
      trim: true
    }, options || {});

  /**
   * Provide connect/express-style middleware
   *
   * @param {IncomingMessage} req
   * @param {ServerResponse} res
   * @param {Function} next
   * @return {*}
   */


  function xmlbodyparser(req, res, next) {

    var data = '';

    var parser = new xml2js.Parser(parserOptions);

    /**
     * @param {Error} err
     * @param {Object} xml
     */

    var responseHandler = function (err, xml) {
        if (err) {
          err.status = 400;
          return next(err);
        }

        req.body = xml || req.body;
        req.rawBody = data;
        next();
    };

    if (req._body) {
      return next();
    }

    req.body = req.body || {};

    if (!hasBody(req) || !regexp.test(mime(req))) {
      return next();
    }

    req._body = true;

    // explicitly cast incoming to string
    req.setEncoding('utf-8');
    req.on('data', function (chunk) {
      data += chunk;
    });

    // in case `parseString` callback never was called, ensure response is sent
    parser.saxParser.onend = function() {
      if (req.complete && req.rawBody === undefined) {
        return responseHandler(null);
      }
    };

    req.on('end', function () {

      // invalid xml, length required
      if (data.trim().length === 0) {
        return next(error(411));
      }

      parser.parseString(data, responseHandler);

    });
  }

  return xmlbodyparser;
}

/**
 * Test whether request has body
 *
 * @see connect.utils
 * @param {IncomingMessage} req
 * @return boolean
 */

function hasBody(req) {
  var encoding = 'transfer-encoding' in req.headers;
  var length = 'content-length' in req.headers && req.headers['content-length'] !== '0';
  return encoding || length;
}

/**
 * Get request mime-type without character encoding
 *
 * @see connect.utils
 * @param {IncomingMessage} req
 * @return string
 */

function mime(req) {
  var str = req.headers['content-type'] || '';
  return str.split(';')[0];
}

/**
 * Factory for new Error with statuscode
 *
 * @see connect.utils
 * @param {number} code
 * @param {*} msg
 * @return {Error}
 */

function error(code, msg) {
  var err = new Error(msg || http.STATUS_CODES[code]);
  err.status = code;
  return err;
}
