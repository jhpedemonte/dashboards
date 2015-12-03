define([
    'jupyter-js-services'
], function(Services) {

    var _outputAreaHandledMsgs = {
        'clear_output': 1,
        'stream': 1,
        'display_data': 1,
        'execute_result': 1,
        'error': 1
    };

    var _kernel;

    function _startKernel(ajaxOptions) {
        var loc = window.location;
        var kernelUrl = loc.protocol + '//' + loc.host;

        var kernelOptions = {
            baseUrl: kernelUrl,
            wsUrl: kernelUrl.replace(/^http/, 'ws'),
            name: 'python3'
        };
        return Services.startNewKernel(kernelOptions, ajaxOptions)
            .then(function(kernel) {
                _kernel = kernel;

                // show a busy indicator when communicating with kernel
                var debounced;
                kernel.statusChanged.connect(function(_kernel, status) {
                    clearTimeout(debounced);
                    debounced = setTimeout(function() {
                        var isBusy = status === Services.KernelStatus.Busy;
                        $('.busy-indicator')
                            .toggleClass('show', isBusy)
                            // Prevent progress animation when hidden by removing 'active' class.
                            .find('.progress-bar')
                                .toggleClass('active', isBusy);
                    }, 500);
                });
                kernel.commOpened.connect(function(_kernel, commMsg) {
                    var comm = kernel.connectToComm(commMsg.target_name, commMsg.comm_id);
                });
            })
            .catch(function(e) {
                console.error('failed to create kernel', e);
            });
    }

    function _execute(cellIndex, resultHandler) {
        var future = _kernel.execute({
            code: cellIndex + '',
            silent: false,
            stop_on_error: true,
            allow_stdin: false
        });
        future.onIOPub = function(msg) {
            if (msg.msg_type in _outputAreaHandledMsgs) {
                resultHandler(msg);
            }
        };
        // TODO error handling
    }

    return {
        start: _startKernel,
        execute: _execute
    };
});
