/**
 * Connect/Express compatible middleware for parsing raw xml body
 *
 * @license MIT
 */

var parseString = require('xml2js').parseString,
    // inlined from connect's 'utils.js' file
    utils = {
        hasBody: function (req) {
            var encoding = 'transfer-encoding' in req.headers,
                length = 'content-length' in req.headers && req.headers['content-length'] !== '0';
            return encoding || length;
        },
        mime: function (req) {
            var str = req.headers['content-type'] || '';
            return str.split(';')[0];
        }
    };

module.exports = function (opts) {

    var options = opts || {
        async: true,
        explicitArray: true,
        normalize: true,
        normalizeTags: true,
        trim: true
    };

    return function xmlbodyparser(req, res, next) {

        var data = '';

        if (req._body) {
            return next();
        }

        req.body = req.body || {};

        if (!utils.hasBody(req) || !exports.regexp.test(utils.mime(req))) {
            return next();
        }

        req._body = true;

        req.setEncoding('utf-8');
        req.on('data', function (chunk) {
            data += chunk;
        });

        req.on('end', function () {
            parseString(data, options, function (err, xml) {
                if (err) {
                    err.status = 400;
                    return next(err);
                }
                req.body = xml;
                req.rawBody = data;
                next();
            });
        });

    };

};

exports.regexp = /^(text\/xml|application\/([\w!#\$%&\*`\-\.\^~]+\+)?xml)$/i;
