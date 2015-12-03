var httpProxy = require('http-proxy');
var debug = require('debug')('dashboard-proxy:server');
var wsutils = require('../app/ws-utils');
var nbstore = require('../app/notebook-store');

// TODO expose as env var
var KERNEL_GATEWAY_URL = 'http://192.168.99.100:9500';

var server = null;
var kernels = {}; // TODO remove old kernels, somehow

var proxy = httpProxy.createProxyServer({
        target: KERNEL_GATEWAY_URL + '/api',
    });

function setupWSProxy(_server) {
    debug('setting up WebSocket proxy');
    server = _server;

    // Listen to the `upgrade` event and proxy the
    // WebSocket requests as well.
    var re = new RegExp('^/api(/.*$)');
    _server.on('upgrade', function(req, socket, head) {
        // save notebook path, based on kernel id
        var matches = req.url.match(/^\/api\/kernels\/([^/]+)/);
        if (matches) {
            var kernelid = matches[1];
            var nbpath = kernels[kernelid];
        } else {
            // TODO error handling
        }

        var oldEmitFn = socket.emit;
        socket.emit = function(eventName, data) {
            if (eventName === 'data') {
                var decodedData = wsutils.decodeWebSocket(data);
                debug('PROXY: received message from WS: ' + decodedData);

                // if (doFilter) {
                //      return; // no-op; do not pass on data
                // }

                // for performance reasons, first do a quick string check before JSON parsing
                if (decodedData.indexOf('execute_request') !== -1) {
                    try {
                        decodedData = JSON.parse(decodedData);
                        if (decodedData.header.msg_type === 'execute_request') {
                            var cellIdx = parseInt(decodedData.content.code, 10);
                            var nb = nbstore.get(nbpath);
                            var code = nb.cells[cellIdx].source.join('');
                            decodedData.content.code = code;
                            data = wsutils.encodeWebSocket(JSON.stringify(decodedData));
                        }
                    } catch(e) {
                        // TODO handle parse error in WS message
                        console.error('Failed to update `data` in WS', e);
                    }
                }
            }
            oldEmitFn.call(socket, eventName, data);
        };

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
    // TODO add API key auth header
    debug('PROXY: WebSocket: ' + req.method + ' ' + proxyReq.path);
});

proxy.on('proxyRes', function (proxyRes, req, res) {
    debug('PROXY: response from ' + req.originalUrl,
        JSON.stringify(proxyRes.headers, true, 2));

    // Store the notebook path for use within the WS proxy. We don't yet have session id (created
    // on client) -- instead, store based on kernel ID.
    if (req.originalUrl === '/api/kernels') {
        proxyRes.on('data', function(chunk) {
            try {
                var data = JSON.parse(chunk);
                if (!kernels.hasOwnProperty(data.id)) {
                    var notebookPathHeader = req.headers['x-jupyter-notebook-path'];
                    if (notebookPathHeader) {
                        var nbpath = notebookPathHeader.match(/^\/notebooks\/(.*)$/)[1];
                        kernels[data.id] = nbpath;
                    } else {
                        // TODO return error status, need notebook path to execute code
                    }
                }
            } catch(e) {
                // TODO error handling
            }
        });
    }
});

module.exports = proxyRoute;
