var fs = require('fs');
var path = require('path');
var Promise = require('es6-promise').Promise;
var Services = require('jupyter-js-services');

function _loadNb(nb) {
    return new Promise(function(resolve, reject) {
        var ipynb = /\.ipynb$/.test(nb) ? '' : '.ipynb';
        var nbPath = path.join(__dirname, '../data/', nb + ipynb);
        console.info('Attempting to load notebook file:',nbPath);
        fs.readFile(nbPath, 'utf8', function(err, rawData) {
            if (err) {
                reject(new Error('Error loading notebook file'));
            } else {
                resolve(rawData);
            }
        });
    });
}

function _stripCode(rawNbData) {
    var nb = JSON.parse(rawNbData); // parse error should be handled in routes
    nb.cells.forEach(function(cell) {
        delete cell.source;
    });
    return nb;
}

module.exports = {
    /**
     * Loads, parses, and returns cells (minus code)
     * of the notebook specified by nb.
     * @param  {String} nb - name of the notbeook to load
     * @return {Promise} ES6 Promise resolved with notebook JSON or error string
     */
    load: _loadNb,

    /**
     * Parses raw notebook data and returns notebook object without source code
     * @param  {JSON} rawNbData - stringified notebook data
     * @return {Object} notebook object stripped of source code
     */
    stripCode: _stripCode
};
