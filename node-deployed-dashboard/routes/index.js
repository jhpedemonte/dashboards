var express = require('express');
var nbops = require('../app/notebook-ops');
var nbstore = require('../app/notebook-store');

var router = express.Router();

/* GET / - redirect to notebook list page */
router.get('/', function(req, res) {
    res.redirect('/notebooks');
});

/* GET /notebooks - list of notebooks */
router.get('/notebooks', function(req, res) {
    res.render('index', {
        title: 'Notebooks'
    });
});

function handleNotebookError(res, status, err, msg) {
    res.status(status);
    res.render('error', {
        message: msg || err.message,
        error: err,
        title: 'error'
    });
}

/* GET /notebooks/* - a single notebook. */
router.get('/notebooks/*', function(req, res) {
    var path = req.params[0];
    if (path) {
        nbops.load(path).then(
            function success(rawData) {
                var notebook;

                // TODO execute nb code in kernel

                try {
                    notebook = JSON.parse(rawData);
                    nbstore.add(path, notebook);

                    res.status(200);
                    res.render('dashboard', {
                        title: 'Dashboard',
                        notebook: notebook
                    });
                } catch(e) {
                    handleNotebookError(res, 500, e, 'Error parsing notebook data');
                }

            },
            function error(err) {
                handleNotebookError(res, 404, err);
            }
        );
    } else {
        // redirect to home page when no path specified
        res.redirect('/');
    }
});

module.exports = router;
