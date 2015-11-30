var httpProxy = require('http-proxy');
var debug = require('debug')('dashboard-proxy:server');

// TODO expose as env var
var KERNEL_GATEWAY_URL = 'http://192.168.99.100:9500';

var server = null;
var proxy = httpProxy.createProxyServer({
        target: KERNEL_GATEWAY_URL + '/api',
    });

function setupWSProxy(_server) {
    debug('setting up WebSocket proxy');
    server = _server;

    // Listen to the `upgrade` event and proxy the
    // WebSocket requests as well.
    var re = new RegExp('^/api(/.*$)');
    _server.on('upgrade', function (req, socket, head) {
        // remove '/api', otherwise proxies to '/api/api/...'
        req.url = re.exec(req.url)[1];
        proxy.ws(req, socket, head);
    });
}

var proxyRoute = function(req, res, next) {
    proxy.web(req, res);

    if (!server) {
        setupWSProxy(req.connection.server);
    }
};

proxy.on('proxyReq', function(proxyReq, req, res, options) {
    debug('PROXY: ' + proxyReq.method + ' ' + proxyReq.path);
});

proxy.on('proxyReqWs', function(proxyReq, req, socket, options, head) {
    debug('PROXY: WebSocket: ' + req.method + ' ' + proxyReq.path);
});

proxy.on('proxyRes', function (proxyRes, req, res) {
    debug('PROXY: response from ' + req.originalUrl,
        JSON.stringify(proxyRes.headers, true, 2));
});

module.exports = proxyRoute;
