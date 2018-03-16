/**
 * Created by pankaj on 22/8/16.
 */
var _ = require('lodash');
var S3_BUCKET_NAME = 'mt.seo.files';
// var S3_BUCKET_NAME = 'mt.dummy';
// var S3_KEY = 'utOpMZROF/nQtPjfc58GiQqCcCoiWg8Kcw3DrsJE'
var fs = require('fs');
var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
var s3 = new AWS.S3({params:{Bucket: S3_BUCKET_NAME}});

module.exports = {
    uploadToS3: function(fileName){
        console.log('uploading', fileName, 'S3');

        fs.stat(fileName, function(err, file_info) {
            if(err){
                console.log(err)
            }

            var bodyStream = fs.createReadStream( fileName);

            var request = s3.putObject({
                Key: fileName,
                ContentType: 'image/png',
                // StorageClass: 'REDUCED_REDUNDANCY',
                Body: bodyStream
                // ContentLength : file_info.size
            }, function(err, result) {
                if (err) console.error(err);
                else{
                    console.log('uploaded...to s3')
                }
                // res.send('finished upload')
            });
        });
    },
    randomString: function(){
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 10; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    },
    afterPhantomRequest: function(req, res, next) {
        if(!req.prerender.documentHTML) {
      		  return next();
      	}
        //
        if(!req.prerender.enableSnapshot){
            console.log('snapshot not allowed in this mode.');
            return next();
        }
        else{
            console.log('beginning to take snapshot.')
        }

        var randomPrefix = this.randomString();
        console.log('taking image for url - '); console.log(req.prerender.url);
        var listView = false;
        if(_.includes(req.prerender.url, 'list'))
        {
            listView = true;
        }
        else{
            console.log('this is not a rank page - no trip snapshots for you!');
        }
        // this.uploadToS3('tripCard_rank_4.png');
        var tempDate = new Date();
        var dateString = tempDate.getFullYear()  + '-' + (tempDate.getMonth() + 1) + '-' + tempDate.getDate();
        var keyPrefix = 'snapshots/' + dateString + '/' + randomPrefix;
        var _this = this;

        req.prerender.page.run(listView, keyPrefix, function(listView, keyPrefix, resolve) {
            var images = [];
            this.viewportSize = { width: 1360, height: 768 };

            this.render(keyPrefix + '/' + 'tripRank.png');
            // _this.uploadToS3(keyPrefix + '/' + 'tripRank.png');
            images.push(keyPrefix + '/' + 'tripRank.png');
            console.log('in listView ----------------');
            if(listView){
                var numOfCards = this.evaluate(function() {
                       return $('.card.whiteBg').length;
                });

                console.log('length of cards - ', numOfCards);

                for(var i = 0; i < numOfCards; i++){
                    var topComputed = 202 + i * (320 + 15);
                    this.clipRect = { top: topComputed, left: (1360-1000)/2, width: 1000, height: 320 };
                    this.render(keyPrefix + '/' + 'tripCard_rank_' + (i + 1) + '.png');
                    images.push(keyPrefix + '/' + 'tripCard_rank_' + (i + 1) + '.png');
                }
            }
            else{
                console.log('didnt create individual snapshots')
            }
            resolve(images)
        }).then(function (images) {
            for(var i = 0 ; i < images.length; i++){
                console.log(images[i]);
                _this.uploadToS3(images[i]);
            }
        });

        return res.send(200, 'Body Length -' + keyPrefix);
        next();
    },

    allowedPageTypes: ['list'],
    name: 'snapShot'
};



