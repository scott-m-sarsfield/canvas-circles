var gulp = require('gulp');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

gulp.task('default',['build'],function(){

    gulp.watch(['src/**'],['build']);
});

gulp.task('build',function(){
    var b = browserify({
        entries:"./src/index.js",
        debug:true
    });

    return b.transform(babelify).bundle()
        .pipe(source('index.js')) // app.js is a pretend file name, BTW
        .pipe(buffer())
        .pipe(gulp.dest('.'));
});
