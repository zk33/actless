'use strict';

var actless = require('actless');
var gulp = require('gulp');

var actlessOptions = actless.options;
/*
 you can modify defaul options
 actless Options
*/


var gulp = actless.initTasks(gulp,__dirname, actlessOptions);
