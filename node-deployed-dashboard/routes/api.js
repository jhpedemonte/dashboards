var httpProxy = require('http-proxy');
var debug = require('debug')('dashboard-proxy:server');
var wsutils = require('../app/ws-utils');
var nbstore = require('../app/notebook-store');

// TODO expose as env var
var KERNEL_GATEWAY_URL = 'http://192.168.99.100:9500';

var server = null;
var sessions = {}; // TODO remove old sessions, somehow

var proxy = httpProxy.createProxyServer({
        target: KERNEL_GATEWAY_URL + '/api'
    });

function setupWSProxy(_server) {
    debug('setting up WebSocket proxy');
    server = _server;

    // Listen to the `upgrade` event and proxy the
    // WebSocket requests as well.
    var re = new RegExp('^/api(/.*$)');
    _server.on('upgrade', function(req, socket, head) {
        var _emit = socket.emit;
        socket.emit = function(eventName, data) {
            if (eventName === 'data') {
                var decodedData = wsutils.decodeWebSocket(data);

                // if (doFilter) {
                //      return; // no-op; do not pass on data
                // }

                for (var i = 0; i < decodedData.length; i++) {
                    var d = decodedData[i];
                    debug('PROXY: received message from client WS: ' + (d && d.payload));

                    // substitute in code if necessary
                    // for performance reasons, first do a quick string check before JSON parsing
                    if (d && d.payload.indexOf('execute_request') !== -1) {
                        try {
                            d.payload = JSON.parse(d.payload);
                            if (d.payload.header.msg_type === 'execute_request') {
                                // get notebook data for current session
                                var nbpath = sessions[d.payload.header.session];
                                var nb = nbstore.get(nbpath);
                                // get code string for cell at index and update WS message
                                var cellIdx = parseInt(d.payload.content.code, 10);
                                var code = nb.cells[cellIdx].source.join('');
                                d.payload.content.code = code;
                                d.payload = JSON.stringify(d.payload);
                            }
                        } catch(e) {
                            // TODO better handle parse error in WS message
                            console.error('Failed to parse `data` in WS', e);
                        }
                    }
                }
                data = wsutils.encodeWebSocket(decodedData);
            }
            _emit.call(socket, eventName, data);
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

    // Store the notebook path for use within the WS proxy.
    if (req.originalUrl === '/api/kernels') {
        var notebookPathHeader = req.headers['x-jupyter-notebook-path'];
        var sessionId = req.headers['x-jupyter-session-id'];
        if (!notebookPathHeader || !sessionId) {
            // TODO return error status, need notebook path to execute code
            console.error('Missing notebook path or session ID headers');
            return;
        }
        var matches = notebookPathHeader.match(/^\/notebooks\/(.*)$/);
        if (!matches) {
            // TODO error handling
            console.error('Invalid notebook path header');
            return;
        }
        sessions[sessionId] = matches[1]; // store notebook path for later use
    }
});

proxy.on('error', function(err, req, res) {
    debug('PROXY: Error with proxy server ' + err);
});

proxy.on('open', function(proxySocket) {
    // listen for messages coming FROM the target here
    // proxySocket.on('data', function(data) {
    //     var decodedData = wsutils.decodeWebSocket(data);
    //     if (!decodedData) {
    //         decodedData = { payload: '[non text data]' };
    //     }
    //     debug('PROXY: received message from target WS: ' + decodedData.payload);
    // });
});

proxy.on('close', function (req, socket, head) {
    // view disconnected websocket connections
    debug('PROXY: WS client disconnected');
});

module.exports = proxyRoute;
