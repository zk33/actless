"use strict";

var actless = require("actless");
var gulp = require("gulp");

var options = actless.options;

// =================================
// you can modify defaul options
// ==================================

// css compile options ======================
//options.css.srcDir = 'assets/css';
//options.css.destDir = 'public/assets/css';
//options.css.sass.outputStyle = 'compact';
//options.css.sass.enabled = true;
//options.css.postcssImport.enabled = true;
//options.css.postcssImport.options = {};
//options.css.postcssPresetEnv.enabled = true;
//options.css.postcssPresetEnv.options.browsers =  ["last 2 versions", "> 4%"];
//options.css.postcssPresetEnv.options.stage = 1 //4:stable >>> 0:unstable features
//options.css.mqpacker.enabled = true;
//options.css.cssnano.enabled = true;

// js compile options ========================
//options.js.enabled = true;
//options.js.srcDir = 'assets/js';
//options.js.destDir = 'public/assets/js';
//options.js.entry = 'assets/js/*.js';
//options.js.watch = ['assets/js/**/*.js', 'assets/js/**/*.jsx'];
//options.js.commonFileName = 'common.js';
//options.js.babelPresets = [['@babel/preset-env',{ "targets": { "browsers": ["last 2 versions", "IE 11"] } }], "@babel/preset-react"];
//options.js.skipMinify = false;

// typescript options ========================
//options.ts.enabled = true;
//options.ts.src = "assets/ts/**/*{ts,tsx}";
//options.ts.destDir = options.js.srcDir;
//options.ts.exclude = [];
//options.ts.configFile = ""; //tsconfig.json
//options.ts.options = { jsx: 'react', target: 'esnext', moduleResolution: 'node' }; // options for gulp-typescript(https://github.com/ivogabe/gulp-typescript) // deprecated

// webpack options ============================
//options.webpack.enabled = false;

// icon font compile options ==================
//options.icon.srcDir = 'assets/icons/';
//options.icon.destDir = 'public/assets/fonts/';
//options.icon.sassDir = '';
//options.icon.fontName = 'icon';
//options.icon.iconCssName = '_icon';
//options.icon.cssTemplate = './node_modules/actless/lib/templates/_icon.scss';
//options.icon.cssFontPath = '../fonts/';
//options.icon.className = 'icon';
//options.icon.exportGlyphsAsProp = true;

// wig(HTML builder) compile options ================
//options.wig.publicDir = 'public';
//options.wig.dataDir = 'data';
//options.wig.tmplDir = 'templates';
//options.wig.verbose = true;

// test server options ===================
//options.server.type = 'node' // 'node' || 'python' || 'php' || 'gae' || 'none'
//options.server.rootDir = 'public';
//options.server.gaeAppRoot = 'app'; // for app engine only
//options.server.options.livereload = true;
//options.server.options.host = "localhost";
//options.server.options.port = 3000;
//options.server.options.fallback = "index.html";

// HTML prettify options =================
//options.prettify.enabled = true;
//options.prettify.tmpDir = 'tmp_html';
/*
options.prettify.options = {
  indent_size: 2,
};
*/

// generate assetHash for cache busterring ===========
//options.assetHash.enabled = true;
//options.assetHash.destDir = '';
//options.assetHash.extraAssetDir = [];

// ==========================================

gulp = actless.initTasks(gulp, __dirname, options);
