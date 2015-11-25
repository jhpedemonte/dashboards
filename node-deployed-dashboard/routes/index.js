var express = require('express');
var nb = require('../app/notebook-ops');

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

/* GET /notebooks/* - a single notebook. */
router.get('/notebooks/*', function(req, res) {
    var path = req.params[0];
    if (path) {
        nb.load(path).then(
            function success(rawData) {
                var nbWithoutCode, status = 200;

                // TODO execute nb code in kernel

                // strip code from nb
                try {
                    nbWithoutCode = nb.stripCode(rawData);
                } catch(e) {
                    nbWidhoutCode = 'Error parsing notebook data';
                    status = 500;
                }

                res.status(status);
                res.render('dashboard', {
                    title: 'Dashboard',
                    notebook: nbWithoutCode
                });
            },
            function error(err) {
                res.status(404);
                res.render('error', {
                    message: err.message+' '+path,
                    error: err,
                    title: 'error'
                });
            }
        );
    } else {
        // redirect to home page when no path specified
        res.redirect('/');
    }
});

module.exports = router;
