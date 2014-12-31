/**
 * Module dependencies.
 */

var parseString = require('xml2js').parseString;
var http = require('http');
var regexp = /^(text\/xml|application\/([\w!#\$%&\*`\-\.\^~]+\+)?xml)$/i;

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

  var parserOptions = options || {
      async: true,
      explicitArray: true,
      normalize: true,
      normalizeTags: true,
      trim: true
    };

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
    req.on('data', function(chunk) {
      data += chunk;
    });

    req.on('end', function() {

      // invalid xml, length required
      if (!data.trim()) {
        return next(error(411));
      }

      parseString(data, parserOptions, function(err, xml) {
        if (err) {
          // maxbe a 50x status is more appropiate on xmlparser error?
          err.status = 400;
          return next(err);
        }
        req.body = xml;
        req.rawBody = data;
        next();
      });
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
