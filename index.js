"use strict";

const path = require("path");
const url = require("url");
const fs = require("fs");
const crypto = require("crypto");

const _ = require("lodash");
const Wig = require("wig");
const open = require("open");
const sass = require("gulp-sass");
const postcss = require("gulp-postcss");
const plumber = require("gulp-plumber");
const browserify = require("browserify");
const babelify = require("babelify");
const factor = require("factor-bundle");
const source = require("vinyl-source-stream");
const file = require("gulp-file");
const concat = require("concat-stream");
const glob = require("glob");
const uglify = require("gulp-uglify");
const shell = require("gulp-shell");
const connect = require("gulp-connect");
const prettify = require("gulp-prettify");
const rename = require("gulp-rename");
const svgmin = require("gulp-svgmin");
const foreach = require("gulp-foreach");
const gulpconcat = require("gulp-concat");
const consolidate = require("gulp-consolidate");
const iconfont = require("gulp-iconfont");
const walkSync = require("walk-sync");

var options = {};

// sass compile options
options.sass = {
  srcDir: "assets/sass",
  destDir: "public/assets/css",
  style: "compact",
  includePaths: ["./node_modules/actless/sass", "./node_modules/sanitize.css"],
  prefixer: {
    // deprecated: please use cssnext
    enabled: false,
    browsers: ["last 2 versions", "> 4%"],
    options: {}
  },
  cssnext: {
    enabled: true,
    options: {
      browsers: ["last 2 versions", "> 4%"]
    }
  },
  mqpacker: {
    enabled: false,
    options: {}
  },
  cssnano: {
    enabled: false,
    options: {}
  }
};
// js compile options
options.js = {
  srcDir: "assets/js",
  entry: "assets/js/*.js",
  watch: ["assets/js/**/*.js", "assets/js/**/*.jsx"],
  destDir: "public/assets/js",
  commonFileName: "common.js",
  babelPresets: [
    [
      "@babel/preset-env",
      {
        targets: {
          browsers: ["last 2 versions", "IE 11"]
        }
      }
    ],
    "@babel/preset-react"
  ],
  exclude: [],
  skipMinify: false
};
// icon font compile options
options.icon = {
  srcDir: "assets/icons/",
  destDir: "public/assets/fonts/",
  sassDir: "",
  renameSrcFile: {
    from: "iconsのコピー_",
    to: ""
  },
  minifiedDir: "assets/icons_min/",
  fontName: "icon",
  iconSassName: "_icon",
  sassTemplate: __dirname + "/lib/templates/_icon.scss",
  sassHashTemplate: __dirname + "/lib/templates/_iconhash.scss",
  sassFontPath: "../fonts/",
  className: "icon",
  options: {}
};
// wig(HTML builder) compile options
options.wig = {
  publicDir: "public",
  dataDir: "data",
  tmplDir: "templates",
  verbose: true
};
// test server options
options.server = {
  type: "node",
  livereload: true,
  rootDir: "public",
  gaeAppRoot: "app", // for app engine only
  url: {
    protocol: "http",
    hostname: "localhost",
    port: 3000
  }
};
// HTML prettify options
options.prettify = {
  enabled: false,
  tmpDir: "tmp_html",
  options: {
    indent_size: 2
  }
};
// generate assetHash for cache busterring
options.assetHash = {
  enabled: true,
  destDir: "",
  extraAssetDir: []
};

var actless = {};

actless.options = options;

actless.initTasks = function(gulp, rootPath) {
  // compile sass (+ autoprefixer) =======

  function runSass() {
    var g = gulp
      .src(path.join(rootPath, options.sass.srcDir, "**", "*"))
      .pipe(plumber())
      .pipe(
        sass({
          includePaths: options.sass.includePaths,
          outputStyle: options.sass.style
        }).on("error", sass.logError)
      );
    //postcss
    var processors = [];
    if (options.sass.cssnext.enabled || options.sass.prefixer.enabled) {
      let opt = options.sass.cssnext.options;
      if (options.sass.prefixer.enabled) {
        console.warn("options.sass.prefixer is deprecated. Use cssnext instead.");
        opt.browsers = options.sass.prefixer.browsers;
      }
      processors.push(require("postcss-cssnext")(opt));
    }
    if (options.sass.mqpacker.enabled) {
      processors.push(require("css-mqpacker")(options.sass.mqpacker.options));
    }
    if (options.sass.cssnano.enabled) {
      processors.push(require("cssnano")(options.sass.cssnano.options));
    }

    if (processors.length) {
      g = g.pipe(postcss(processors));
    }
    g = g.pipe(plumber.stop()).pipe(gulp.dest(path.join(rootPath, options.sass.destDir)));
    return g;
  }
  gulp.task("actless:sass", runSass);

  function watchSass(cb) {
    gulp.watch(
      [
        path.join(rootPath, options.sass.srcDir) + "/**/*.scss",
        path.join(rootPath, options.sass.srcDir) + "/**/*.sass",
        "!" + path.join(rootPath, options.sass.srcDir) + "/**/*.swp"
      ],
      gulp.series("actless:sass")
    );
    cb();
  }
  gulp.task("actless:sass:watch", watchSass);

  /*
    build JS ========================================================
    ref：http://qiita.com/inuscript/items/b933af4d44a4712cb8f8
  */
  function runJs() {
    var write = filepath => {
      return concat(content => {
        var res = file(path.basename(filepath), content, {
          src: true
        });
        if (!options.js.skipMinify) {
          res.pipe(uglify());
        }
        res.pipe(gulp.dest(path.join(rootPath, options.js.destDir)));
        return res;
      });
    };
    var files = glob.sync(path.join(rootPath, options.js.entry), {
      nodir: true
    });
    var outputFiles = files.map(fileName => {
      return write(fileName.replace(options.js.srcDir, options.js.destDir));
    });

    var b = browserify(files, {
      extensions: ["js", "jsx"],
      debug: true
    });
    for (var i = 0, len = options.js.exclude.length; i < len; i++) {
      b = b.exclude(options.js.exclude[i]);
    }
    b = b
      .transform(
        babelify.configure({
          presets: options.js.babelPresets
        })
      )
      .plugin(factor, {
        output: outputFiles
      })
      .bundle()
      .on("error", function(err) {
        console.warn("Error : " + err.message + "\n" + err.stack);
        this.emit("end"); // for prevent stop 'watch'
      })
      .pipe(write(options.js.commonFileName))
      .on("error", function(err) {
        console.warn("Error : " + err.message + "\n" + err.stack);
        this.emit("end");
      });
    return b;
  }
  gulp.task("actless:js", runJs);

  function watchJs(cb) {
    gulp.watch(options.js.watch, gulp.series("actless:js"));
    cb();
  }

  gulp.task("actless:js:watch", watchJs);

  // bulid icon font ===========================================

  function runSvgmin() {
    return gulp
      .src(path.join(rootPath, options.icon.srcDir, "**", "*.svg"))
      .pipe(
        foreach((stream, file) => {
          var filename = file.path.replace(file.base, "");
          filename = filename.replace(options.icon.renameSrcFile.from, options.icon.renameSrcFile.to);
          return stream.pipe(svgmin()).pipe(gulpconcat(filename));
        })
      )
      .pipe(gulp.dest(path.join(rootPath, options.icon.minifiedDir)));
  }
  gulp.task("actless:icons:svgmin", runSvgmin);

  function compileIcons() {
    return gulp
      .src(path.join(rootPath, options.icon.minifiedDir, "**", "*.svg"))
      .pipe(
        iconfont(
          Object.assign({
              fontName: options.icon.fontName,
              className: options.icon.className,
              formats: ["svg", "ttf", "eot", "woff"],
              startUnicode: 0xf001,
              fontHeight: 512,
              descent: 64
            },
            options.icon.options
          )
        )
      )
      .on("glyphs", (codepoints, opt) => {
        var sassDir = options.icon.sassDir ? options.icon.sassDir : options.sass.srcDir;
        codepoints.forEach(val => {
          val.codepoint = val.unicode[0]
            .charCodeAt(0)
            .toString(16)
            .toUpperCase();
        });
        gulp
          .src(options.icon.sassTemplate)
          .pipe(
            consolidate("nunjucks", {
              glyphs: codepoints,
              fontName: options.icon.fontName,
              fontPath: options.icon.sassFontPath,
              className: options.icon.className,
              varName: options.icon.iconSassName.substr(1)
            })
          )
          .pipe(gulpconcat(options.icon.iconSassName + ".scss"))
          .pipe(gulp.dest(path.join(rootPath, sassDir)));
      })
      .pipe(gulp.dest(path.join(rootPath, options.icon.destDir)));
  }
  gulp.task("actless:icons:compile", compileIcons);

  function runIconHash() {
    var data;
    try {
      data = fs.readFileSync(path.join(rootPath, options.icon.destDir, options.icon.fontName + ".woff"));
    } catch (e) {
      console.log(e);
      return;
    }
    var hash = crypto.createHash("md5");
    var sassDir = options.icon.sassDir ? options.icon.sassDir : options.sass.srcDir;
    hash.update(data);
    return gulp
      .src(options.icon.sassHashTemplate)
      .pipe(
        consolidate("nunjucks", {
          hash: hash.digest("hex")
        })
      )
      .pipe(gulpconcat("_iconhash.scss"))
      .pipe(gulp.dest(path.join(rootPath, sassDir)));
  }
  gulp.task("actless:icons:hash", runIconHash);

  const watchIcons = gulp.series(runSvgmin, compileIcons, runIconHash, function(cb) {
    gulp.watch(path.join(rootPath, options.icon.srcDir, "**", "*.svg"), gulp.series("actless:icons:svgmin"));
    gulp.watch(path.join(rootPath, options.icon.minifiedDir, "**", "*.svg"), gulp.series("actless:icons:compile"));
    gulp.watch(
      path.join(rootPath, options.icon.destDir, options.icon.fontName + ".woff"),
      gulp.series("actless:icons:hash")
    );
    cb();
  });
  gulp.task("actless:icons:watch", watchIcons);

  // wig ==========================
  var wigOpt = _.assign({}, options.wig);
  wigOpt.rootDir = rootPath;
  if (!_.isArray(wigOpt.tmplDir)) {
    wigOpt.tmplDir = [wigOpt.tmplDir];
  }
  wigOpt.tmplDir.push(path.join(__dirname, "templates"));
  // change output directory if prettify is enabled
  if (options.prettify && options.prettify.enabled) {
    wigOpt.outDir = options.prettify.tmpDir || "html_tmp";
  }
  var builder;

  function runWig(cb) {
    if (!builder) {
      builder = new Wig(wigOpt);
      builder.addRendererFilter("date", require("nunjucks-date-filter"));
    }
    try {
      builder.build();
    } catch (e) {
      console.log(e);
    }
    cb();
  }
  gulp.task("actless:wig", runWig);
  var wigWatchSrc = [
    path.join(rootPath, wigOpt.dataDir, "**", "*"),
    path.join(rootPath, options.wig.tmplDir, "**", "*"),
    "!" + path.join(rootPath, wigOpt.dataDir, "**", "*.swp"),
    "!" + path.join(rootPath, options.wig.tmplDir, "**", "*.swp")
  ];
  const watchWig = function(cb) {
    gulp.watch(wigWatchSrc, gulp.series("actless:wig"));
    cb();
  };
  gulp.task("actless:wig:watch", watchWig);

  // prettify =====================
  if (options.prettify.enabled) {
    var prettifySrc = [];
    var nonPrettifySrc = [];

    prettifySrc.push(path.join(rootPath, options.prettify.tmpDir, "**", "*.html"));
    nonPrettifySrc.push(path.join(rootPath, options.prettify.tmpDir, "**", "*"));
    nonPrettifySrc.push("!" + path.join(rootPath, options.prettify.tmpDir, "**", "*.html"));

    function runPrettify() {
      return gulp
        .src(prettifySrc)
        .pipe(prettify(options.prettify.options))
        .pipe(gulp.dest(options.wig.publicDir));
    }
    gulp.task("actless:prettify", runPrettify);

    function runNonPrettify() {
      return gulp.src(nonPrettifySrc).pipe(gulp.dest(options.wig.publicDir));
    }
    gulp.task("actless:nonPrettify", runNonPrettify);

    var prettifyTimeoutId;
    gulp.task("actless:prettify:watch:run", function(cb) {
      if (prettifyTimeoutId) {
        clearTimeout(prettifyTimeoutId);
      }
      prettifyTimeoutId = setTimeout(runPrettify, 500);
      cb();
    });
    var nonprettifyTimeoutId;
    gulp.task("actless:nonPrettify:watch:run", function(cb) {
      if (nonprettifyTimeoutId) {
        clearTimeout(nonprettifyTimeoutId);
      }
      nonprettifyTimeoutId = setTimeout(runNonPrettify, 500);
      cb();
    });

    function watchPrettify(cb) {
      var prettifyTimeoutId = null;
      var nonprettifyTimeoutId = null;
      gulp.watch(prettifySrc, gulp.series("actless:prettify:watch:run"));
      gulp.watch(nonPrettifySrc, gulp.series("actless:nonPrettify:watch:run"));
      cb();
    }
    gulp.task("actless:prettify:watch", watchPrettify);
  }


  // test server ========================

  var runServer = function(cb) {
    console.log("actless:server not defined");
    cb();
  };
  var runServerOpen = function(cb) {
    console.log("actless:server:open not defined");
    cb();
  };
  var runServerLivereload = function(cb) {
    console.log("actless:server:livereload not defined");
    cb();
  };
  var watchServerLivereload = function(cb) {
    console.log("actless:server:livereload:watch not defined");
    cb();
  };
  if (options.server.type !== "none") {
    var testUrl = url.format(options.server.url);
    runServerOpen = function(cb) {
      open(testUrl);
      cb();
    };
  }

  if (options.server.type === "node") {
    // test server(Nodejs)
    runServer = function(cb) {
      connect.server({
        root: path.join(rootPath, options.server.rootDir),
        port: options.server.url.port,
        livereload: options.server.livereload
      });
      cb();
    };
    if (options.server.livereload) {
      runServerLivereload = function() {
        return gulp.src(path.join(rootPath, options.server.rootDir, "**", "*.*")).pipe(connect.reload());
      };
      var llTimeoutId;
      gulp.task("actless:server:livereload:reload", function(cb) {
        if (llTimeoutId) {
          clearTimeout(llTimeoutId);
          llTimeoutId = null;
        }
        llTimeoutId = setTimeout(runServerLivereload, 500);
        cb();
      });
      watchServerLivereload = function(cb) {
        gulp.watch(
          [
            path.join(rootPath, options.server.rootDir, "**", "*.css"),
            path.join(rootPath, options.server.rootDir, "**", "*.js"),
            path.join(rootPath, options.server.rootDir, "**", "*.html")
          ],
          gulp.series("actless:server:livereload:reload")
        );
        cb();
      };
    }
  } else if (options.server.type === "php") {
    // test server(PHP)
    var cmd =
      "php -S " +
      options.server.url.hostname +
      ":" +
      options.server.url.port +
      " -t" +
      path.join(rootPath, options.server.rootDir);
    runServer = shell.task([cmd]);
  } else if (options.server.type === "python") {
    // test server(Python)
    var cmd =
      "pushd " +
      path.join(rootPath, options.server.rootDir) +
      "; python -m SimpleHTTPServer " +
      options.server.url.port +
      "; popd";
    runServer = shell.task([cmd]);
  } else if (options.server.type === "gae") {
    // test server(GAE)
    var cmd =
      "dev_appserver.py --port=" + options.server.url.port + " " + path.join(rootPath, options.server.gaeAppRoot);
    runServer = shell.task([cmd]);
  }

  gulp.task("actless:server", runServer);
  gulp.task("actless:server:open", runServerOpen);
  gulp.task("actless:server:livereload", runServerLivereload);
  gulp.task("actless:server:livereload:watch", watchServerLivereload);

  // generate asset file hash(JS/CSS) ============================
  /* calc checksum ======================================= */
  var assetHashDestDir = options.assetHash.destDir ? options.assetHash.destDir : options.wig.dataDir;
  var assetHashSrc = [path.join(rootPath, options.sass.destDir), path.join(rootPath, options.js.destDir)];
  Array.prototype.push.apply(
    assetHashSrc,
    options.assetHash.extraAssetDir.map(v => {
      return path.join(rootPath, v);
    })
  );

  function runAssetHash(cb) {
    if (options.assetHash.enabled) {
      var res = {};
      var dir, files, fName, data, hash;
      for (var i = 0, len = assetHashSrc.length; i < len; i++) {
        dir = assetHashSrc[i];
        files = walkSync(dir, {
          directories: false
        });
        for (var k = 0, kLen = files.length; k < kLen; k++) {
          fName = files[k];
          if (fName.charAt(0) !== ".") {
            data = fs.readFileSync(path.join(dir, fName));
            hash = crypto.createHash("md5");
            hash.update(data.toString(), "utf8");
            res[fName] = hash.digest("hex");
          }
        }
      }
      fs.writeFileSync(path.join(assetHashDestDir, "_assetHash.json"), JSON.stringify(res, null, 2));
    }
    cb();
  }
  gulp.task("actless:assetHash", runAssetHash);

  var assetHashWatchSrc = [
    path.join(rootPath, options.sass.destDir, "**", "*.css"),
    path.join(rootPath, options.js.destDir, "**", "*.js")
  ];
  Array.prototype.push.apply(
    assetHashWatchSrc,
    options.assetHash.extraAssetDir.map(v => {
      return path.join(rootPath, v, "**", "*");
    })
  );

  const watchAssetHash = gulp.series("actless:assetHash", function(cb) {
    gulp.watch(assetHashWatchSrc, gulp.series("actless:assetHash"));
    cb();
  });
  gulp.task("actless:assetHash:watch", watchAssetHash);

  // compile
  const runCompile = gulp.parallel(
    gulp.series(gulp.parallel("actless:sass", "actless:js"), "actless:assetHash"),
    (options.prettify.enabled ? gulp.series("actless:wig", gulp.parallel("actless:prettify", "actless:nonPrettify")) : "actless:wig")
  );
  gulp.task("actless:compile", runCompile);

  // compile all
  const runCompileFull = gulp.parallel(
    "actless:compile",
    gulp.series("actless:icons:svgmin", "actless:icons:compile", "actless:icons:hash")
  );
  gulp.task("actless:compile:full", runCompileFull);

  // watch
  const watchTasks = ["actless:sass:watch",
    "actless:js:watch",
    "actless:assetHash:watch",
    "actless:wig:watch"
  ]
  if (options.prettify.enabled) {
    watchTasks.push("actless:prettify:watch");
  }

  const runWatch = gulp.parallel.apply(null, watchTasks);
  gulp.task("actless:watch", runWatch);

  // watch all
  const runWatchFull = gulp.parallel("actless:watch", "actless:icons:watch");
  gulp.task("actless:watch:full", runWatchFull);

  // default
  var defaultTasks = ["actless:compile", "actless:watch"];
  // full
  var fullTasks = ["actless:compile:full", "actless:watch:full"];
  if (options.server.type !== "none") {
    defaultTasks.push("actless:server", "actless:server:open");
    fullTasks.push("actless:server", "actless:server:open");
  }
  if (options.server.type === "node" && options.server.livereload) {
    defaultTasks.push("actless:server:livereload", "actless:server:livereload:watch");
    fullTasks.push("actless:server:livereload", "actless:server:livereload:watch");
  }
  const runDefault = gulp.parallel.apply(null, defaultTasks);
  const runDefaultFull = gulp.parallel.apply(null, fullTasks);
  gulp.task("actless:default", runDefault);
  gulp.task("actless:full", runDefaultFull);
  gulp.task("default", runDefault);
  gulp.task("full", runDefaultFull);

  return gulp;
};

module.exports = actless;
