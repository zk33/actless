//gulpfile(for test)
var gulp = require("gulp");
var actless = require("./index.js");

var opt = actless.options;
opt.sass.mqpacker.enabled = true;
opt.sass.cssnano.enabled = true;
opt.wig.tmplDir = "tmpl";
opt.prettify.enabled = true;
opt.icon.useTmp = true;
opt.icon.options.normalize = true;

opt.js.enabled = false;
opt.js.skipMinify = false;
opt.webpack.enabled = true;

opt.js.srcDir = "assets/js";
opt.js.entry = "assets/js/*.js";
opt.js.watch = ["assets/js/**/*.js", "assets/js/**/*.jsx"];
opt.ts.enabled = true;
opt.ts.destDir = opt.js.srcDir;
opt.ts.configFile = "tsconfig.json";

actless.initTasks(gulp, __dirname);
