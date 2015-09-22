//gulpfile(for test)
var gulp = require('gulp');
var actless = require('./index.js');

var opt = actless.options;
opt.wig.tmplDir = 'tmpl';
opt.prettify.enabled = true;
opt.icon.useTmp = true;

actless.initTasks(gulp, __dirname)
