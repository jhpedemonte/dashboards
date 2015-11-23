var Services = require('jupyter-js-services');
var request = require('request');
var Promise = require('es6-promise').Promise;
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var WebSocket = require('ws');

global.XMLHttpRequest = XMLHttpRequest;
global.WebSocket = WebSocket;

function init(config) {
    var baseUrl = config.kernelGatewayUrl;
    baseUrl += (baseUrl[baseUrl.length - 1] === '/' ? '' : '/'); // ensure it ends in '/'

    // check if we need to spawn a new container or use existing one
    // check for a previous container, which we can reuse
    // var containerUrl = localStorage.getItem(CONTAINER_URL);
    // TODO get CONTAINER_URL from request
    var containerUrl = null;

    // TODO return CONTAINER_URL to the client
    return checkExistingContainer(containerUrl)
        .then(function(containerExists) {
            if (!containerExists) {
                console.log('spawning! [', baseUrl, ']');
                return callSpawn(baseUrl);
            } else {
                return { url: containerUrl };
            }
        })
        .then(function(data) {
            var kernelOptions = {
                baseUrl: data.url,
                wsUrl: data.url.replace(/^http/, 'ws'),
                name: 'python3'
            };
            console.log('starting new kernel at', data.url);
            Services.startNewKernel(kernelOptions)
                .then(function(kernel) {
                    setupKernel(kernel);
                    return true;
                }).catch(function(e) {
                    console.error('Failed to create session/kernel:', e);
                });
        });
}

// generates a session URL containing a unique id
function generateSessionUrl() {
    // TODO get path from request
    return window.location.pathname + '#' + generateId();
}

// adapted from http://guid.us/GUID/JavaScript
function generateId() {
    return (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
}

// register event handlers on a new kernel
function setupKernel(_kernel) {
    console.log('> setupKernel');
    kernel = _kernel;

    kernel.commOpened.connect(function(_kernel, commMsg) {
        console.log('> commOpened');
        var comm = kernel.connectToComm(commMsg.target_name, commMsg.comm_id);
    });
}

// Spawn a new kernel container. Returns promise to container URL.
function callSpawn(baseUrl) {
    return new Promise(function(resolve, reject) {
        request.post({
            url: baseUrl + 'api/spawn/',
            json: true
            // body: { image_name: 'jupyter/notebook' }, // TODO remove if not necessary
        }, function(error, response, body) {
            // console.log(response);
            if (!error && response.statusCode >= 200 && response.statusCode < 300) {
                console.log(body);
                if (body.status === 'full') {
                    reject('tmpnb server is full');
                    // throw new Error('tmpnb server is full');
                } else {
                    // test if we have a full URL (new tmpnb) or partial (old tmpnb)
                    if (!/^http/.test(body.url)) {
                        body.url = baseUrl + body.url;
                    }
                    resolve(body);
                }
            } else if (error) {
                reject('error spawning tmpnb container' + error);
                // throw new Error('error spawning tmpnb container', error);
            }
        });
    });
}

// Check if container at URL is valid. Returns promise to boolean value.
function checkExistingContainer(url) {
    return new Promise(function(resolve, reject) {
        if (!url) {
            return resolve(false); // There is no existing container
        }

        url += (url[url.length - 1] === '/' ? '' : '/'); // ensure it ends in '/'

        request.get(url + 'api/kernels', function(error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    var data = JSON.parse(body);
                    resolve(true);
                } catch(e) {
                    // JSON conversion failed, most likely because response is HTML text telling us
                    // that the container doesn't exist. Therefore, fail.
                    resolve(false);
                    // TODO let client know to clear local storage for CONTAINER_URL
                }
            } else if (error) {
                resolve(false);
                // TODO let client know to clear local storage for CONTAINER_URL
            }
        });
    });
}

module.exports = {
    init: init
};
