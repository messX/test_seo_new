var cacheManager = require('cache-manager');
var S3_BUCKET_NAME = 'mt.seo.files';
var s3 = new (require('aws-sdk')).S3({params:{Bucket: S3_BUCKET_NAME}});
var _ = require('lodash');
var util = require('../util');
module.exports = {
    init: function() {
        this.cache = cacheManager.caching({
            store: s3_cache
        });
    },

    beforePhantomRequest: function(req, res, next) {
        if(req.method !== 'GET') {
            return next();
        }

        if(req.prerender.enableSnapshot){
            console.log('snapshot enabled, the request will not be checked in cache');
            return next();
        }

        this.cache.get(req.prerender.url, function (err, result) {

            if (!err && result) {
                console.log('cache hit');
                return res.send(200, result.Body);
            }
            
            next();
        });
    },

    afterPhantomRequest: function(req, res, next) {
        if(req.prerender.statusCode !== 200) {
            return next();
        }

        if(req.prerender.enableSnapshot){
            console.log('snapshot enabled, the request will not be stored in cache');
            return next();
        }
        var length = req.prerender.documentHTML.length;
        
        if(length < 50000){
            console.log('result size less than 50KB, skipping the upload.');
            return next();
        }

        this.cache.set(req.prerender.url, req.prerender.documentHTML, function(err, result) {
            if (err) console.error(err);
            next();
        });
    },
    allowedPageTypes: ['*'],
    name: 's3HtmlCache'
};


var s3_cache = {
    getKey: function (key) {
        if (process.env.S3_PREFIX_KEY) {
            key = process.env.S3_PREFIX_KEY + '/' + key;
        }
        util.log(key);
        key = _.replace(key, new RegExp('^https?://'), '');
        util.log(key);
        return key;
    },
    get: function(key, callback) {
        key = this.getKey(key);
        s3.getObject({
            Key: key
        }, callback);
    },
    set: function(key, value, callback) {
        key = this.getKey(key);
        var request = s3.putObject({
            Key: key,
            ContentType: 'text/html;charset=UTF-8',
            StorageClass: 'REDUCED_REDUNDANCY',
            Body: value
        }, callback);

        if (!callback) {
            request.send();
        }
    }
};
