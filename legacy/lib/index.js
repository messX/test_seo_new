var cluster = require('cluster')
  , os = require('os')
  , fs = require('fs')
  , path = require('path')
  , http = require('http')
  , _ = require('lodash')
  , util = require('./util')
  , basename = path.basename
  , onExit = require('signal-exit');

// Starts either a server or client depending on whether this is a master or
// worker cluster process
exports = module.exports = function(options) {
    var port = options.port || process.env.PORT || 3000;
    var hostname = options.hostname || process.env.NODE_HOSTNAME || undefined;

    var server = require('./server');
    options.isMaster = cluster.isMaster;
    options.worker = cluster.worker;
    // util.log(cluster);
    server.init(options);

    if(cluster.isMaster) {

        var workersPhantomjsPid = {};

        for (var i = 0; i < (options.workers || os.cpus().length); i += 1) {
            util.log('starting worker thread #' + i);
            var worker = cluster.fork();

            worker.on('message', function(msg) {
                // util.log('from thread - ' + i +  msg )
                workersPhantomjsPid[this.id] = msg['phantomjsPid'];
                // util.log(workersPhantomjsPid)
            });
        }

        cluster.on('online', function(worker) {
            console.log('Worker ' + worker.process.pid + ' is online');
        });

        cluster.on('exit', function (worker) {
            if (worker.suicide === true || worker.exitedAfterDisconnect === true) return;

            if(workersPhantomjsPid[worker.id]) {
                process.kill(workersPhantomjsPid[worker.id], 'SIGKILL');
                delete workersPhantomjsPid[worker.id];
            }

            util.log('worker ' + worker.id + ' died, restarting!');
            cluster.fork();
        });
    } else {
        util.log('worker thread...');
        var app = require('express')();
        app.all('/snapshot/*', _.bind(server.onRequest, server));
        app.all('/seo/*', _.bind(server.onRequest, server));
        // app.all('/seo/snapshot/*detail*', _.bind(server.onRequest, server));
        // app.all('/*list*', _.bind(server.onRequest, server));
        // app.all('/*detail*', _.bind(server.onRequest, server));
        app.all('/*static*', function (req, res) {
                   res.send('Hello Static World');
                });
        // app.get('/', function (req, res) {
        //     res.send('Hello World')
        // });
        //var httpServer = http.createServer(_.bind(server.onRequest, server));
        //
        // httpServer.listen(port, hostname, function () {
        //     util.log('Server running on port ' + port);
        // });

        app.listen(port, hostname, function () {
            util.log('Server running on port ' + port);
        });

        onExit(function() {
            util.log('Terminating worker #' + cluster.worker.id);
            server.exit();
        });
    }

    return server;
};

fs.readdirSync(__dirname + '/plugins').forEach(function(filename){
    if (!/\.js$/.test(filename)) return;
    var name = basename(filename, '.js');
    function load(){
        var plugin = require('./plugins/' + name);
        if(plugin.allowedPageTypes == undefined)
            throw "add allowedPageTypes";
        return plugin
    }
    Object.defineProperty(exports, name, {value: load});
});
