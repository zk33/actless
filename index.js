"use strict";

var path = require('path');
var url = require('url');
var fs = require('fs');
var crypto = require('crypto');

var _ = require('lodash');
var Wig = require('wig');
var open = require('open');
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var plumber = require('gulp-plumber');
var watch = require('gulp-watch');
var shell = require('gulp-shell');
var connect = require('gulp-connect');
var prettify = require('gulp-prettify');
var rename = require('gulp-rename');
var svgmin = require('gulp-svgmin');
var foreach = require('gulp-foreach');
var gulpconcat = require('gulp-concat');
var consolidate = require('gulp-consolidate');
var iconfont = require('gulp-iconfont');

var options = {
  publicDir: 'public',
  sass: {
    srcDir: 'assets/sass',
    destDir: 'public/assets/css',
    style: 'compact',
    loadPath: [
      __dirname + '/node_modules/actless/sass',
      __dirname + '/node_modules/bootstrap-sass/assets/stylesheets',
      __dirname + '/node_modules/material-design-lite/src',
      __dirname + '/node_modules/sanitize.css',
      __dirname + '/bower_components/csswizardry-grids',
      __dirname + '/node_modules/wig/node_modules/' // for highlight.js ※なおしたい
    ],
    prefixer: {
      browsers: ['last 2 versions', '> 4%']
    }
  },
  icon: {
    srcDir: 'assets/icons/',
    distDir: 'public/assets/fonts/',
    renameSrcFile: {
      from: 'iconsのコピー_',
      to: ''
    },
    minifiedDir: 'assets/icons_min/',
    fontName: 'icons',
    iconSassName: '_icons',
    sassTemplate:__dirname + '/lib/templates/_icon.scss',
    sassHashTemplate:__dirname + '/lib/templates/_iconhash.scss',
    sassFontPath:'../fonts/',
    className: 'icon',
  },
  wig: {
    outDir: 'public',
    dataDir: 'data',
    tmplDir: 'templates',
    verbose: true
  },
  js: {},
  server: {
    type: 'node',
    livereload: true,
    url: {
      protocol: 'http',
      hostname: 'localhost',
      port: 3000
    }
  },
  prettify: {
    enabled: false,
    tmpDir: 'tmp_html',
    options: {
      indent_size: 2,
    }
  }
}

var actless = {};

actless.options = options;

actless.initTasks = function(gulp, rootPath) {
  // compile sass (+ autoprefixer) =======
  gulp.task('actless:sass', function() {
    var g = gulp.src(path.join(rootPath, options.sass.srcDir, '**', '*'))
      .pipe(plumber())
      .pipe(sass({
        includePaths: options.sass.loadPath,
        outputStyle: options.sass.style
      }).on('error', sass.logError))
    if (options.sass.prefixer) {
      g = g.pipe(prefix(options.sass.prefixer));
    }
    g = g.pipe(plumber.stop())
      .pipe(gulp.dest(path.join(rootPath, options.sass.destDir)))
  });

  gulp.task('actless:sass:watch', function() {
    watch([
      path.join(rootPath, options.sass.srcDir) + '/**/*.scss',
      path.join(rootPath, options.sass.srcDir) + '/**/*.sass',
      '!' + path.join(rootPath, options.sass.srcDir) + '/**/*.swp'
    ], function() {
      gulp.start('actless:sass');
    });
  });

  // bulid icon font ===========================================

  gulp.task('actless:icons:svgmin', () => {
    return gulp.src(path.join(rootPath, options.icon.srcDir, '**', '*.svg'))
      .pipe(foreach((stream, file) => {
        var filename = file.path.replace(file.base, '');
        filename = filename.replace(options.icon.renameSrcFile.from,options.icon.renameSrcFile.to);
        return stream.pipe(svgmin())
          .pipe(gulpconcat(filename))
      }))
      .pipe(gulp.dest(path.join(rootPath, options.icon.minifiedDir)));
  });


  gulp.task('actless:icons:compile', () => {
    return gulp.src(path.join(rootPath, options.icon.minifiedDir, '**', '*.svg'))
      .pipe(iconfont({
        fontName: options.icon.fontName,
        className: options.icon.className,
        formats: ['svg', 'ttf', 'eot', 'woff'],
        startUnicode: 0xF001,
        fontHeight: 512,
        descent: 64
      }))
      .on('glyphs', (codepoints, opt) => {
        var sassDir = options.icon.sassDir ? options.icon.sassDir : options.sass.srcDir;
        codepoints.forEach((val) => {
          val.codepoint = val.unicode[0].charCodeAt(0).toString(16).toUpperCase();
        });
        gulp.src(options.icon.sassTemplate)
          .pipe(consolidate('nunjucks', {
            glyphs: codepoints,
            fontName: options.icon.fontName,
            fontPath: options.icon.sassFontPath,
            className: options.icon.className
          }))
          .pipe(gulpconcat(options.icon.iconSassName + '.scss'))
          .pipe(gulp.dest(path.join(rootPath, sassDir)));
      })
      .pipe(gulp.dest(path.join(rootPath,options.icon.distDir)));
  });

  gulp.task('actless:icons:hash', function() {
    var data;
    try{
      data = fs.readFileSync(path.join(rootPath,options.icon.distDir,options.icon.fontName + '.woff'));
    }catch(e){
      console.log(e);
      return;
    }
    var hash = crypto.createHash('md5');
    var sassDir = options.icon.sassDir ? options.icon.sassDir : options.sass.srcDir;
    hash.update(data);
    gulp.src(options.icon.sassHashTemplate)
      .pipe(consolidate('nunjucks', {
        hash: hash.digest('hex')
      }))
      .pipe(gulpconcat('_iconhash.scss'))
      .pipe(gulp.dest(path.join(rootPath, sassDir)))
  });

  gulp.task('actless:icons:watch', ['actless:icons:svgmin', 'actless:icons:compile', 'actless:icons:hash'], function() {
    gulp.watch(path.join(rootPath, options.icon.srcDir, '**', '*.svg'), ['actless:icons:svgmin']);
    gulp.watch(path.join(rootPath, options.icon.minifiedDir, '**', '*.svg'), ['actless:icons:compile']);
    gulp.watch(path.join(rootPath,options.icon.distDir,options.icon.fontName + '.woff'), ['actless:icons:hash']);
  });

  // wig ==========================
  var wigOpt = _.assign({}, options.wig);
  wigOpt.rootDir = rootPath;
  if (!_.isArray(wigOpt.tmplDir)) {
    wigOpt.tmplDir = [wigOpt.tmplDir];
  }
  wigOpt.tmplDir.push(path.join(__dirname, 'templates'));
  // change output directory if prettify is enabeld
  if (options.prettify && options.prettify.enabled) {
    wigOpt.outDir = options.prettify.tmpDir || 'html_tmp';
  }
  var builder = new Wig(wigOpt);
  builder.addRendererFilter('date', require('nunjucks-date-filter'));
  gulp.task('actless:wig', function() {
    try {
      builder.build();
    } catch (e) {
      console.log(e);
    }
  });
  var wigWatchSrc = [
    path.join(rootPath, wigOpt.dataDir, '**', '*'),
    path.join(rootPath, options.wig.tmplDir, '**', '*'),
    '!' + path.join(rootPath, wigOpt.dataDir, '**', '*.swp'),
    '!' + path.join(rootPath, options.wig.tmplDir, '**', '*.swp')
  ]
  gulp.task('actless:wig:watch', function() {
    watch(wigWatchSrc, function() {
      gulp.start('actless:wig');
    });
  });

  // prettify =====================
  var prettifySrc = [];
  var nonPrettifySrc = [];
  if (options.prettify.enabled) {
    prettifySrc.push(path.join(rootPath, options.prettify.tmpDir, '**', '*.html'));
    nonPrettifySrc.push(path.join(rootPath, options.prettify.tmpDir, '**', '*'));
    nonPrettifySrc.push('!' + path.join(rootPath, options.prettify.tmpDir, '**', '*.html'));
  }
  gulp.task('actless:prettify', function() {
    gulp.src(prettifySrc)
      .pipe(prettify(options.prettify.options))
      .pipe(gulp.dest(options.publicDir));
  });
  gulp.task('actless:nonPrettify', function() {
    gulp.src(nonPrettifySrc).pipe(gulp.dest(options.publicDir));
  });
  gulp.task('actless:prettify:watch', function() {
    var prettifyTimeoutId = null;
    var nonprettifyTimeoutId = null;
    watch(prettifySrc, function() {
      if (prettifyTimeoutId) {
        clearTimeout(prettifyTimeoutId);
      }
      prettifyTimeoutId = setTimeout(function() {
        gulp.start('actless:prettify');
      }, 500);
    })
    watch(nonPrettifySrc, function() {
      if (nonprettifyTimeoutId) {
        clearTimeout(nonprettifyTimeoutId);
      }
      nonprettifyTimeoutId = setTimeout(function() {
        gulp.start('actless:nonPrettify');
      }, 500);
    })
  });

  // test server
  var testUrl = url.format(options.server.url);
  gulp.task('actless:server:open', function() {
    open(testUrl);
  });

  if (options.server.type === 'node') {
    // test server(Nodejs)
    gulp.task('actless:server', function() {
      connect.server({
        root: path.join(rootPath, options.publicDir),
        port: options.server.url.port,
        livereload: options.server.livereload
      });
    });
    if (options.server.livereload) {
      gulp.task('actless:server:livereload', function() {
        gulp.src(path.join(rootPath, options.publicDir, '**', '*.*')).pipe(connect.reload());
      });
      gulp.task('actless:server:livereload:watch', function() {
        var timeoutId = null;
        watch([
          path.join(rootPath, options.publicDir, '**', '*.css'),
          path.join(rootPath, options.publicDir, '**', '*.js'),
          path.join(rootPath, options.publicDir, '**', '*.html')
        ], function() {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          timeoutId = setTimeout(function() {
            gulp.start('actless:server:livereload');
          }, 500);
        });
      });
    }
  } else if (options.server.type === 'php') {
    // test server(PHP)
    var cmd = 'php -S ' + options.server.hostname + ':' + options.server.url.port + ' -t' + path.join(rootPath, options.publicDir);
    gulp.task('actless:server', shell.task([cmd]));
  } else if (options.server.type === 'python') {
    // test server(Python)
    var cmd = 'pushd ' + path.join(rootPath, options.publicDir) + '; python -m SimpleHTTPServer ' + optiions.server.url.port + '; popd'
    gulp.task('server_py', shell.task([cmd]));
  } else if (options.server.type === 'gae') {
    // test server(GAE)
    var cmd = 'dev_appserver.py --port=' + options.server.url.port + ' ' + path.join(rootPath, options.publicDir);
  }


  gulp.task('actless:compile', ['actless:sass', 'actless:wig', 'actless:prettify', 'actless:nonPrettify']);
  gulp.task('actless:compile-full', ['actless:compile', 'actless:icons:svgmin', 'actless:icons:compile', 'actless:icons:hash']);
  gulp.task('actless:watch', ['actless:sass:watch', 'actless:wig:watch', 'actless:prettify:watch']);
  gulp.task('actless:watch-full', ['actless:watch', 'actless:icons:watch']);
  var defaultTasks = ['actless:compile', 'actless:watch', 'actless:server', 'actless:server:open'];
  var fullTasks = ['actless:compile-full', 'actless:watch-full', 'actless:server', 'actless:server:open'];
  if (options.server.livereload) {
    defaultTasks.push('actless:server:livereload');
    defaultTasks.push('actless:server:livereload:watch');
    fullTasks.push('actless:server:livereload');
    fullTasks.push('actless:server:livereload:watch');
  }
  gulp.task('actless:default', defaultTasks);
  gulp.task('actless:full', fullTasks);
  gulp.task('default', ['actless:default']);
  gulp.task('full', ['actless:full']);

  return gulp;
}

module.exports = actless;
