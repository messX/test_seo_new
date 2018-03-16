var minify = require('html-minifier').minify;

module.exports = {
    afterPhantomRequest: function(req, res, next) {
      	if(!req.prerender.documentHTML) {
      		  return next();
      	}
        var length = req.prerender.documentHTML.length;
        console.log('before compression - ', length);
        req.prerender.documentHTML = minify(req.prerender.documentHTML, {
            removeAttributeQuotes: true,
            minifyCSS: true,
            minifyJS: true,
            conservativeCollapse: true,
            collapseWhitespace: true,
            removeComments: true
        });
        length = req.prerender.documentHTML.length;
        console.log('after compression - ', length);
        var matches = req.prerender.documentHTML.toString().match(/<script(?:.*?)>(?:[\S\s]*?)<\/script>/gi);
        for (var i = 0; matches && i < matches.length; i++) {
            if(matches[i].indexOf('application/ld+json') === -1) {
                req.prerender.documentHTML = req.prerender.documentHTML.toString().replace(matches[i], '');
            }
        }
        length = req.prerender.documentHTML.length;
        console.log('size of text after remove script tags - ', length);
         //remove the unnecessary css which has been injected
        matches = req.prerender.documentHTML.toString().match(/<style md-theme-style(?:.*?)>(?:[\S\s]*?)<\/style>/gi);
        for (i = 0; matches && i < matches.length; i++) {

            // console.log( 'index - ' + i + 'matches - ' + matches[i].length);
            req.prerender.documentHTML = req.prerender.documentHTML.toString().replace(matches[i], '');
            console.log('size of text after removing injected css - ', req.prerender.documentHTML.length);
        }

        next();
    },
    allowedPageTypes: ['*'],
    name: 'removeScriptTags'
};
