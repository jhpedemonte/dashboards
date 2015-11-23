var gulp = require('gulp'),
  nodemon = require('gulp-nodemon'),
  plumber = require('gulp-plumber'),
  livereload = require('gulp-livereload'),
  less = require('gulp-less'),
  browserify = require('browserify'),
  source = require('vinyl-source-stream'),
  merge = require('merge-stream');

// browserify & copy components to `public/components`
gulp.task('browserify:components', function() {
    var components = [
        'jupyter-js-services',
        'jupyter-js-output-area'
    ];

    var tasks = components.map(function(compName) {
        return browserify({
                standalone: compName
            })
            .require(compName)
            .bundle()
            //Pass desired output filename to vinyl-source-stream
            .pipe(source(compName + '.js'))
            // Start piping stream to tasks!
            .pipe(gulp.dest('./public/components'));
    });

    return merge(tasks);
});

// XXX This tries to combine jupyter components into 1 file, but doesn't seem to fully work --
//     resulting file only seems to contain exports for `services` but not for `output-area`
// gulp.task('browserify:components', function() {
//     return browserify({
//             standalone: 'jupyter'
//         })
//         .require('jupyter-js-services')
//         .require('jupyter-js-output-area')
//         .bundle()
//         //Pass desired output filename to vinyl-source-stream
//         .pipe(source('jupyter.js'))
//         // Start piping stream to tasks!
//         .pipe(gulp.dest('./public/components'));
// });

// gulp.task('browserify:js', ['components'], function() {
//     return browserify('./public/js/main.js')
//         .external('./public/components/jupyter-modules.js')
//         .bundle()
//         //Pass desired output filename to vinyl-source-stream
//         .pipe(source('app.js'))
//         // Start piping stream to tasks!
//         .pipe(gulp.dest('./public/js'));
// });

// copy source into `public/components`
gulp.task('copy:components', ['browserify:components'], function() {
    return gulp.src('./node_modules/requirejs/require.js')
        .pipe(gulp.dest('./public/components'));
});

gulp.task('less', function () {
  gulp.src('./public/css/*.less')
    .pipe(plumber())
    .pipe(less())
    .pipe(gulp.dest('./public/css'))
    .pipe(livereload());
});

gulp.task('watch', function() {
  gulp.watch('./public/css/*.less', ['less']);
});

gulp.task('develop', function () {
  livereload.listen();
  nodemon({
    script: 'bin/www',
    ext: 'js handlebars coffee',
    stdout: false
  }).on('readable', function () {
    this.stdout.on('data', function (chunk) {
      if(/^Express server listening on port/.test(chunk)){
        livereload.changed(__dirname);
      }
    });
    this.stdout.pipe(process.stdout);
    this.stderr.pipe(process.stderr);
  });
});

gulp.task('components', [
    'browserify:components',
    'copy:components'
]);

gulp.task('build', [
    'less',
    'components'
]);

gulp.task('default', [
  'build',
  'develop',
  'watch'
]);
