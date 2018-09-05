//gulpfile(for test)
var gulp = require('gulp');
var actless = require('./index.js');

var opt = actless.options;
opt.sass.cssnext.enabled = true;
opt.sass.mqpacker.enabled = true;
opt.sass.cssnano.enabled = true;
opt.wig.tmplDir = 'tmpl';
opt.prettify.enabled = true;
opt.icon.useTmp = true;
opt.icon.options.normalize = true;

opt.js.skipMinify = false;

actless.initTasks(gulp, __dirname)
