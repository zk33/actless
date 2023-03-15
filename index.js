"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const _ = require("lodash");
const Wig = require("wig");
const open = require("open");
const sass = require("gulp-sass")(require("sass"));
const postcss = require("gulp-postcss");
const plumber = require("gulp-plumber");
const browserify = require("browserify");
const babelify = require("babelify");
const factor = require("factor-bundle");
const file = require("gulp-file");
const concat = require("concat-stream");
const glob = require("glob");
const uglify = require("gulp-uglify");
const shell = require("gulp-shell");
const prettify = require("gulp-prettify");
const svgmin = require("gulp-svgmin");
const flatmap = require("gulp-flatmap");
const gulpconcat = require("gulp-concat");
const consolidate = require("gulp-consolidate");
const iconfont = require("gulp-iconfont");
const walkSync = require("walk-sync");
const webserver = require("gulp-webserver");
const typescript = require("gulp-typescript");

var options = {};
var hasBrowserList = fs.existsSync("./.browserlistrc");
if (!hasBrowserList) {
  console.warn("Make .browserlistrc file for babel/postcss etc.");
}

// css compile options
options.css = {
  srcDir: "",
  destDir: "public/assets/css",
  sass: {
    enabled: true,
    outputStyle: "expanded",
    includePaths: [
      "./node_modules/actless/sass",
      "./node_modules/sanitize.css",
    ],
  },
  postcssImport: {
    enabled: true,
    options: {},
  },
  postcssPresetEnv: {
    enabled: true,
    options: {
      stage: 1,
    },
  },
  mqpacker: {
    enabled: true,
    options: {},
  },
  cssnano: {
    enabled: true,
    options: {},
  },
  stylelint: {
    enabled: false,
    options: {},
  },
};
options.sass = options.css; // for backward compatibility
// js compile options
options.js = {
  enabled: true,
  srcDir: "assets/js",
  entry: "assets/js/*.js",
  watch: ["assets/js/**/*.js", "assets/js/**/*.jsx"],
  destDir: "public/assets/js",
  commonFileName: "common.js",
  babelPresets: [["@babel/preset-env", {}], "@babel/preset-react"],
  exclude: [],
  skipMinify: false,
};
// ts compile options
options.ts = {
  enabled: false,
  src: "assets/ts/**/*{ts,tsx}",
  destDir: options.js.srcDir,
  exclude: [],
  configFile: "",
  options: {
    jsx: "react",
    target: "esnext",
    moduleResolution: "node",
  },
};
// webpack options
options.webpack = {
  enabled: false,
};

// icon font compile options
options.icon = {
  srcDir: "assets/icons/",
  destDir: "public/assets/fonts/",
  sassDir: "",
  renameSrcFile: {
    from: "iconsのコピー_",
    to: "",
  },
  minifiedDir: "assets/icons_min/",
  fontName: "icon",
  iconCssName: "_icon",
  cssTemplate: __dirname + "/lib/templates/_icon.scss",
  cssFontPath: "../fonts/",
  className: "icon",
  exportGlyphsAsProp: true,
  options: {},
};
// wig(HTML builder) compile options
options.wig = {
  enabled: true,
  publicDir: "public",
  dataDir: "data",
  tmplDir: "templates",
  verbose: true,
};
// test server options
options.server = {
  type: "node",
  rootDir: "public",
  gaeAppRoot: "app", // for app engine only
  url: {}, // for backward compatibility...
  options: {
    path: "/",
    livereload: true,
    host: "localhost",
    port: 3000,
    fallback: undefined,
    https: false,
  },
};
// HTML prettify options
options.prettify = {
  enabled: false,
  tmpDir: "tmp_html",
  options: {
    indent_size: 2,
  },
};
// generate assetHash for cache busterring
options.assetHash = {
  enabled: true,
  destDir: "",
  extraAssetDir: [],
};

var actless = {};

actless.options = options;

actless.initTasks = function (gulp, rootPath) {
  // set NODE_ENV to "production"
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  // compile css  =======
  if (!options.css.srcDir) {
    if (options.css.sass.enabled) {
      options.css.srcDir = "assets/sass";
    } else {
      options.css.srcDir = "assets/css";
    }
  }
  if (!hasBrowserList) {
    options.css.postcssPresetEnv.options.browsers = [
      "last 2 versions",
      "> 4%",
      "not dead",
    ];
  }
  function runCss() {
    var g = gulp
      .src(path.join(rootPath, options.css.srcDir, "**", "!(_*)"))
      .pipe(plumber());
    if (options.css.sass.enabled) {
      g = g.pipe(
        sass({
          includePaths: options.css.sass.includePaths,
          outputStyle: options.css.sass.outputStyle,
        }).on("error", sass.logError)
      );
    }
    //postcss(preprocess)
    var preprocessors = [];
    if (!options.css.sass.enabled && options.css.postcssImport.enabled) {
      if (options.css.stylelint.enabled) {
        options.css.postcssImport.options.plugins =
          options.css.postcssImport.options.plugins || [];
        options.css.postcssImport.options.plugins.push(
          require("stylelint")(options.css.stylelint.options)
        );
      }
      preprocessors.push(
        require("postcss-import")(options.css.postcssImport.options)
      );
    }
    if (options.css.postcssPresetEnv.enabled) {
      let opt = options.css.postcssPresetEnv.options;
      preprocessors.push(require("postcss-preset-env")(opt));
    }
    if (preprocessors.length) {
      g = g.pipe(postcss(preprocessors));
    }

    //postcss(postprocess)
    var postprocessors = [];
    if (options.css.mqpacker.enabled) {
      postprocessors.push(
        require("@hail2u/css-mqpacker")(options.css.mqpacker.options)
      );
    }
    if (options.css.cssnano.enabled) {
      postprocessors.push(require("cssnano")(options.css.cssnano.options));
    }
    if (postprocessors.length) {
      g = g.pipe(postcss(postprocessors));
    }

    g = g
      .pipe(plumber.stop())
      .pipe(gulp.dest(path.join(rootPath, options.css.destDir)));
    return g;
  }
  gulp.task("actless:css", runCss);
  gulp.task("actless:sass", runCss); //for backward compatibility

  function watchCss(cb) {
    gulp.watch(
      [
        path.join(rootPath, options.css.srcDir) + "/**/*",
        path.join(rootPath, options.css.srcDir) + "/**/*",
        "!" + path.join(rootPath, options.css.srcDir) + "/**/*.swp",
      ],
      gulp.series("actless:css")
    );
    cb();
  }
  gulp.task("actless:css:watch", watchCss);
  gulp.task("actless:sass:watch", watchCss); //for backward compatibility

  /*
    build JS ========================================================
    ref：http://qiita.com/inuscript/items/b933af4d44a4712cb8f8
  */
  function runJs() {
    var write = (filepath) => {
      return concat((content) => {
        var res = file(path.basename(filepath), content, {
          src: true,
        });
        if (!options.js.skipMinify) {
          res.pipe(uglify());
        }
        res.pipe(gulp.dest(path.join(rootPath, options.js.destDir)));
        return res;
      });
    };
    var files = glob.sync(path.join(rootPath, options.js.entry), {
      nodir: true,
    });
    var outputFiles = files.map((fileName) => {
      return write(fileName.replace(options.js.srcDir, options.js.destDir));
    });

    var b = browserify(files, {
      extensions: ["js", "jsx"],
      debug: true,
    });
    for (var i = 0, len = options.js.exclude.length; i < len; i++) {
      b = b.exclude(options.js.exclude[i]);
    }
    b = b
      .transform(
        babelify.configure({
          presets: options.js.babelPresets,
        })
      )
      .plugin(factor, {
        output: outputFiles,
      })
      .bundle()
      .on("error", function (err) {
        console.warn("Error : " + err.message + "\n" + err.stack);
        this.emit("end"); // for prevent stop 'watch'
      })
      .pipe(write(options.js.commonFileName))
      .on("error", function (err) {
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

  // typescript ================================================

  let tsProject = typescript.createProject(
    options.ts.configFile ? options.ts.configFile : options.ts.options
  );
  function runTS(cb) {
    return gulp
      .src(options.ts.src)
      .pipe(tsProject())
      .on("error", function (err) {
        console.warn("Error : " + err.message + "\n" + err.stack);
        this.emit("end");
      })
      .pipe(gulp.dest(options.ts.destDir));
  }
  gulp.task("actless:ts", runTS);
  function watchTS(cb) {
    gulp.watch(options.ts.src, gulp.series("actless:ts"));
    cb();
  }
  gulp.task("actless:ts:watch", watchTS);

  // webpack ===================================================

  const runWebpack = shell.task(["npx webpack --mode production"]);
  gulp.task("actless:webpack", runWebpack);
  const watchWebpack = shell.task(["npx webpack --mode production -w"]);
  gulp.task("actless:webpack:watch", watchWebpack);

  // bulid icon font ===========================================

  function runSvgmin() {
    return gulp
      .src(path.join(rootPath, options.icon.srcDir, "**", "*.svg"))
      .pipe(
        flatmap((stream, file) => {
          var filename = file.path.replace(file.base, "");
          filename = filename.replace(
            options.icon.renameSrcFile.from,
            options.icon.renameSrcFile.to
          );
          return stream.pipe(svgmin()).pipe(gulpconcat(filename));
        })
      )
      .pipe(gulp.dest(path.join(rootPath, options.icon.minifiedDir)));
  }
  gulp.task("actless:icons:svgmin", runSvgmin);

  let currentCodepoints = null;
  function compileIcons() {
    return gulp
      .src(path.join(rootPath, options.icon.minifiedDir, "**", "*.svg"))
      .pipe(
        iconfont(
          Object.assign(
            {
              fontName: options.icon.fontName,
              className: options.icon.className,
              formats: ["svg", "ttf", "eot", "woff"],
              startUnicode: 0xf001,
              fontHeight: 512,
              descent: 64,
            },
            options.icon.options
          )
        )
      )
      .on("glyphs", (codepoints, opt) => {
        currentCodepoints = codepoints;
      })
      .pipe(gulp.dest(path.join(rootPath, options.icon.destDir)));
  }
  gulp.task("actless:icons:compile", compileIcons);

  function runIconHash() {
    var data;
    try {
      data = fs.readFileSync(
        path.join(
          rootPath,
          options.icon.destDir,
          options.icon.fontName + ".woff"
        )
      );
    } catch (e) {
      console.log(e);
      return;
    }
    var hash = crypto.createHash("md5");
    var cssDir = options.icon.sassDir
      ? options.icon.sassDir
      : options.css.srcDir;
    hash.update(data);
    currentCodepoints.forEach((val) => {
      val.codepoint = val.unicode[0].charCodeAt(0).toString(16).toUpperCase();
    });
    return gulp
      .src(options.icon.cssTemplate)
      .pipe(
        consolidate("nunjucks", {
          hash: hash.digest("hex"),
          glyphs: currentCodepoints,
          fontName: options.icon.fontName,
          fontPath: options.icon.cssFontPath,
          className: options.icon.className,
          varName: options.icon.iconCssName.substr(1),
          isSass: !!options.css.sass.enabled,
          exportProp: !!options.icon.exportGlyphsAsProp,
        })
      )
      .pipe(
        gulpconcat(
          options.icon.iconCssName +
            (options.css.sass.enabled ? ".scss" : ".css")
        )
      )
      .pipe(gulp.dest(path.join(rootPath, cssDir)));
  }
  gulp.task("actless:icons:hash", runIconHash);

  const watchIcons = gulp.series(
    runSvgmin,
    compileIcons,
    runIconHash,
    function (cb) {
      gulp.watch(
        path.join(rootPath, options.icon.srcDir, "**", "*.svg"),
        gulp.series("actless:icons:svgmin")
      );
      gulp.watch(
        path.join(rootPath, options.icon.minifiedDir, "**", "*.svg"),
        gulp.series("actless:icons:compile")
      );
      gulp.watch(
        path.join(
          rootPath,
          options.icon.destDir,
          options.icon.fontName + ".woff"
        ),
        gulp.series("actless:icons:hash")
      );
      cb();
    }
  );
  gulp.task("actless:icons:watch", watchIcons);
  gulp.task(
    "actless:icons:build",
    gulp.series(
      "actless:icons:svgmin",
      "actless:icons:compile",
      "actless:icons:hash"
    )
  );

  // wig ==========================
  if (options.wig.enabled) {
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
        //builder.addRendererFilter("date", require("nunjucks-date-filter"));
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
      "!" + path.join(rootPath, options.wig.tmplDir, "**", "*.swp"),
    ];
    const watchWig = function (cb) {
      gulp.watch(wigWatchSrc, gulp.series("actless:wig"));
      cb();
    };
    gulp.task("actless:wig:watch", watchWig);
  }

  // prettify =====================
  // ※wigがdisabledの時=常にdisabled
  if (options.wig.enabled && options.prettify.enabled) {
    var prettifySrc = [];
    var nonPrettifySrc = [];

    prettifySrc.push(
      path.join(rootPath, options.prettify.tmpDir, "**", "*.html")
    );
    nonPrettifySrc.push(
      path.join(rootPath, options.prettify.tmpDir, "**", "*")
    );
    nonPrettifySrc.push(
      "!" + path.join(rootPath, options.prettify.tmpDir, "**", "*.html")
    );

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
    gulp.task("actless:prettify:watch:run", function (cb) {
      if (prettifyTimeoutId) {
        clearTimeout(prettifyTimeoutId);
      }
      prettifyTimeoutId = setTimeout(runPrettify, 500);
      cb();
    });
    var nonprettifyTimeoutId;
    gulp.task("actless:nonPrettify:watch:run", function (cb) {
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

  options.server.options.port =
    options.server.url.port || options.server.options.port;
  options.server.options.host =
    options.server.url.hostname || options.server.options.host;

  var runServer = function (cb) {
    console.log("actless:server not defined");
    cb();
  };
  var runServerOpen = function (cb) {
    console.log("actless:server:open not defined");
    cb();
  };

  if (options.server.type !== "none") {
    var testUrl = options.server.options.https ? "https://" : "http://";
    testUrl = testUrl + options.server.options.host;
    testUrl = testUrl + ":" + options.server.options.port;
    console.log(testUrl);
    runServerOpen = function (cb) {
      open(testUrl);
      cb();
    };
  }

  if (options.server.type === "node") {
    // test server(Nodejs)
    runServer = () => {
      return gulp
        .src(options.server.rootDir)
        .pipe(webserver(options.server.options));
    };
  } else if (options.server.type === "php") {
    // test server(PHP)
    var cmd =
      "php -S " +
      options.server.options.host +
      ":" +
      options.server.options.port +
      " -t" +
      path.join(rootPath, options.server.rootDir);
    runServer = shell.task([cmd]);
  } else if (options.server.type === "python") {
    // test server(Python)
    var cmd =
      "pushd " +
      path.join(rootPath, options.server.rootDir) +
      "; python -m SimpleHTTPServer " +
      options.server.options.port +
      "; popd";
    runServer = shell.task([cmd]);
  } else if (options.server.type === "gae") {
    // test server(GAE)
    var cmd =
      "dev_appserver.py --port=" +
      options.server.options.port +
      " " +
      path.join(rootPath, options.server.gaeAppRoot);
    runServer = shell.task([cmd]);
  }

  gulp.task("actless:server", runServer);
  gulp.task("actless:server:open", runServerOpen);

  // generate asset file hash(JS/CSS) ============================
  /* calc checksum ======================================= */
  var assetHashDestDir = options.assetHash.destDir
    ? options.assetHash.destDir
    : options.wig.dataDir;
  var assetHashSrc = [
    path.join(rootPath, options.css.destDir),
    path.join(rootPath, options.js.destDir),
  ];
  Array.prototype.push.apply(
    assetHashSrc,
    options.assetHash.extraAssetDir.map((v) => {
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
          directories: false,
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
      fs.writeFileSync(
        path.join(assetHashDestDir, "_assetHash.json"),
        JSON.stringify(res, null, 2)
      );
    }
    cb();
  }
  gulp.task("actless:assetHash", runAssetHash);

  var assetHashWatchSrc = [
    path.join(rootPath, options.css.destDir, "**", "*.css"),
    path.join(rootPath, options.js.destDir, "**", "*.js"),
  ];
  Array.prototype.push.apply(
    assetHashWatchSrc,
    options.assetHash.extraAssetDir.map((v) => {
      return path.join(rootPath, v, "**", "*");
    })
  );

  const watchAssetHash = gulp.series("actless:assetHash", function (cb) {
    gulp.watch(assetHashWatchSrc, gulp.series("actless:assetHash"));
    cb();
  });
  gulp.task("actless:assetHash:watch", watchAssetHash);

  // define gulp tasks ===========================================

  // compile
  const mainParaTasks = ["actless:css"];
  if (options.js.enabled) {
    mainParaTasks.push("actless:js");
  }
  const compileMainTasks = [];
  if (mainParaTasks.length) {
    compileMainTasks.push(gulp.parallel.apply(null, mainParaTasks));
  }
  compileMainTasks.push("actless:assetHash");
  if (options.ts.enabled) {
    compileMainTasks.unshift("actless:ts");
  }
  if (options.webpack.enabled) {
    compileMainTasks.push("actless:webpack");
  }
  const compileParaTasks = [gulp.series.apply(null, compileMainTasks)];
  if (options.wig.enabled) {
    compileParaTasks.push(
      options.prettify.enabled
        ? gulp.series(
            "actless:wig",
            gulp.parallel("actless:prettify", "actless:nonPrettify")
          )
        : "actless:wig"
    );
  }
  const runCompile =
    compileParaTasks.length === 1
      ? compileParaTasks[0]
      : gulp.parallel.apply(null, compileParaTasks);

  gulp.task("actless:compile", runCompile);

  // compile all
  const runCompileFull = gulp.parallel(
    "actless:compile",
    "actless:icons:build"
  );
  gulp.task("actless:compile:full", runCompileFull);

  // watch
  const watchTasks = ["actless:css:watch"];
  if (options.js.enabled) {
    watchTasks.push("actless:js:watch");
  }
  watchTasks.push("actless:assetHash:watch");
  if (options.wig.enabled) {
    watchTasks.push("actless:wig:watch");
  }
  if (options.ts.enabled) {
    watchTasks.push("actless:ts:watch");
  }
  if (options.webpack.enabled) {
    watchTasks.push("actless:webpack:watch");
  }
  if (options.wig.enabled && options.prettify.enabled) {
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
  const runDefault = gulp.parallel.apply(null, defaultTasks);
  const runDefaultFull = gulp.parallel.apply(null, fullTasks);
  const runDev = (cb) => {
    process.env.NODE_ENV = "development";
    options.js.skipMinify = true;
    cb();
  };
  gulp.task("actless:developmentMode", runDev);
  gulp.task("actless:default", runDefault);
  gulp.task("actless:full", runDefaultFull);
  gulp.task(
    "actless:dev",
    gulp.series("actless:developmentMode", "actless:default")
  );
  gulp.task("default", runDefault);
  gulp.task("full", runDefaultFull);
  gulp.task("dev", gulp.series("actless:developmentMode", "actless:default"));

  return gulp;
};

module.exports = actless;
