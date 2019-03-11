//gulpfile(for test)
var gulp = require("gulp");
var actless = require("./index.js");

var opt = actless.options;
opt.sass.cssnext.enabled = true;
opt.sass.mqpacker.enabled = true;
opt.sass.cssnano.enabled = true;
opt.wig.tmplDir = "tmpl";
opt.prettify.enabled = true;
opt.icon.useTmp = true;
opt.icon.options.normalize = true;

opt.js.skipMinify = false;

opt.js.srcDir = 'assets/js2';
opt.js.entry = "assets/js2/*.js";
opt.js.watch = ["assets/js2/**/*.js", "assets/js2/**/*.jsx"];
opt.ts.enabled = true;
opt.ts.destDir = opt.js.srcDir;

actless.initTasks(gulp, __dirname);
