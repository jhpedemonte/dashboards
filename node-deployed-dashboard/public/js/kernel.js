define([
    'jupyter-js-services'
], function(Services) {

    function _startKernel() {
        var loc = window.location;
        var kernelUrl = loc.protocol + '//' + loc.host;

        var kernelOptions = {
            baseUrl: kernelUrl,
            wsUrl: kernelUrl.replace(/^http/, 'ws'),
            name: 'python3'
        };
        Services.startNewKernel(kernelOptions)
            .then(function(kernel) {
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

    return {
        start: _startKernel
    };
});
