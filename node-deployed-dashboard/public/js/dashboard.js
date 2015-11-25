require(['main'], function() {
    require([
        'jquery',
        'gridstack-custom',
        'jupyter-js-services',
        'jupyter-js-output-area'
    ], function($, Gridstack, Services, OutputArea) {
        'use strict';

        var CONTAINER_URL = 'urth_container_url';
        var SESSION_URL = 'urth_session_url';

        var $container = $('#dashboard-container');

        function _getQueryParam(name) {
            var vars = window.location.search.substring(1).split('&');
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split('=');
                if (pair[0] === name) {
                    return decodeURIComponent(pair[1]);
                }
            }
            return null;
        }

        function _initGrid() {
            // enable gridstack
            var gridstack = $container.gridstack({
                vertical_margin: Urth.cellMargin,
                cell_height: Urth.defaultCellHeight,
                width: Urth.maxColumns,
                static_grid: true
            }).data('gridstack');

            var halfMargin = Urth.cellMargin / 2;
            var styleRules = [
                {
                    selector: '#dashboard-container .grid-stack-item',
                    rules: 'padding: ' + halfMargin + 'px ' + (halfMargin + 6) + 'px;'
                }
            ];
            gridstack.generateStylesheet(styleRules);
        }

        function _showRow(row, col) {
            $('body').addClass('show-row-only');
            var $cells = $container.find('.grid-stack-item');

            var rowAttr = '[data-gs-y="' + row + '"]';
            $cells.filter(':not(' + rowAttr + ')').hide();

            if (col) {
                // show a single cell
                $('body').addClass('single-cell');
                var colAttr = '[data-gs-x="' + col + '"]';
                $cells.filter(':not(' + colAttr + ')').hide();
            } else {
                // show full row
                $cells.filter(rowAttr).css('flex', function() {
                    var $cell = $(this);
                    var sizex = $cell.attr('data-gs-width');
                    return sizex + ' 0 ' + sizex + 'px';
                });
            }
        }

        // create an output area for each dashboard cell
        $('.dashboard-cell').each(function() {
            var model = new OutputArea.OutputModel();
            var view = new OutputArea.OutputView(model, document);
            $(this).append(view.el);
        });

        // initialize Gridstack
        var row = _getQueryParam('row');
        if (!row) {
            _initGrid();
        } else {
            // show only given row/column
            var col = getQueryParam('col');
            showRow(row, col);
        }

    });
})
