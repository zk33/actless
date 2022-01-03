//gulpfile(for test)
var gulp = require("gulp");
var actless = require("./index.js");

var opt = actless.options;
opt.css.sass.enabled = false;
opt.css.mqpacker.enabled = true;
opt.css.cssnano.enabled = true;
opt.wig.tmplDir = "tmpl";
opt.prettify.enabled = true;
opt.icon.useTmp = true;
opt.icon.options.normalize = true;
opt.icon.exportGlyphsAsProp = false;

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
