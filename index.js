"use strict";

var path = require('path');
var url = require('url');

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

var options ={
  publicDir:'public',
  sass:{
    srcDir: 'assets/sass',
    destDir: 'public/assets/css',
    style:'compact',
    loadPath:[
      __dirname + '/node_modules/actless/sass',
      __dirname + '/node_modules/bootstrap-sass/assets/stylesheets',
      __dirname + '/node_modules/material-design-lite/src',
      __dirname + '/node_modules/sanitize.css',
      __dirname + '/bower_components/csswizardry-grids',
      __dirname + '/node_modules/wig/node_modules/' // for highlight.js ※なおしたい
    ],
    prefixer:{
      browsers:['last 2 versions','> 4%']
    }
  },
  icon:{
    srcDir: 'assets/icons',
    useTmp: false,
    tmpDir: 'assets/icons_tmp',
    renameTmpFile:{
      from:'iconsのコピー_',
      to:''
    }
  },
  wig:{
    outDir:'public',
    dataDir:'data',
    tmplDir:'templates',
    verbose:true
  },
  js:{
  },
  server:{
    type:'node',
    livereload:true,
    url:{
      protocol:'http',
      hostname:'localhost',
      port:3000
    }
  },
  prettify:{
    enabled: false,
    tmpDir: 'tmp_html',
    options:{
      indent_size: 2,
    }
  }
}

var actless = {};

actless.options = options;

actless.initTasks = function(gulp,rootPath){
  // compile sass (+ autoprefixer) =======
  gulp.task('actless:sass', function(){
    var g = gulp.src( path.join(rootPath , options.sass.srcDir, '**', '*'))
      .pipe(plumber())
      .pipe(sass({
        includePaths: options.sass.loadPath,
        outputStyle: options.sass.style
      }).on('error',sass.logError))
    if(options.sass.prefixer){
      g = g.pipe( prefix(options.sass.prefixer) );
    }
      g = g.pipe(plumber.stop())
        .pipe(gulp.dest( path.join( rootPath, options.sass.destDir)))
  });

  gulp.task('actless:sass:watch',function(){
    watch([
      path.join(rootPath, options.sass.srcDir) + '/**/*.scss',
      path.join(rootPath, options.sass.srcDir) + '/**/*.sass',
      '!' + path.join(rootPath, options.sass.srcDir) + '/**/*.swp'
    ], function(){
      gulp.start('actless:sass');
    });
  });

  // compile icons with fontcustom ====================

  gulp.task('actless:icons', shell.task([
    'fontcustom compile'
  ]));
  gulp.task('actless:icons:tmp',function(){
    if(!options.icon.useTmp){
      return;
    }
    gulp.src(path.join(rootPath,options.icon.tmpDir,'**','*.svg'))
      .pipe(rename(function(p){
        p.basename = p.basename.replace(
          options.icon.renameTmpFile.from,
          options.icon.renameTmpFile.to
        );
      }))
      .pipe(gulp.dest(path.join(rootPath,options.icon.srcDir)));
  });

  gulp.task('actless:icons:watch',function(){
    watch(path.join(rootPath,options.icon.srcDir,'**','*.svg'), function(){
      gulp.start('actless:icons');
    });
    if(options.icon.useTmp){
      watch(path.join(rootPath,options.icon.tmpDir,'**','*.svg'),function(){
        gulp.start('actless:icons:tmp');
      })
    }
  });

  // wig ==========================
  var wigOpt = _.assign({},options.wig);
  wigOpt.rootDir = rootPath;
  if(!_.isArray(wigOpt.tmplDir)){
    wigOpt.tmplDir = [wigOpt.tmplDir];
  }
  wigOpt.tmplDir.push( path.join(__dirname,'templates') );
  // change output directory if prettify is enabeld
  if(options.prettify && options.prettify.enabled){
    wigOpt.outDir = options.prettify.tmpDir || 'html_tmp';
  }
  var builder = new Wig(wigOpt);
  builder.addRendererFilter('date', require('nunjucks-date-filter'));
  gulp.task('actless:wig', function(){
    try{
      builder.build();
    }catch(e){
      console.log(e);
    }
  });
  var wigWatchSrc = [
    path.join(rootPath,wigOpt.dataDir,'**','*'),
    path.join(rootPath,options.wig.tmplDir,'**','*'),
    '!' + path.join(rootPath,wigOpt.dataDir,'**','*.swp'),
    '!' + path.join(rootPath,options.wig.tmplDir,'**','*.swp')
  ]
  gulp.task('actless:wig:watch',function(){
    watch(wigWatchSrc, function(){
      gulp.start('actless:wig');
    });
  });

  // prettify =====================
  var prettifySrc = [];
  var nonPrettifySrc = [];
  if(options.prettify.enabled){
    prettifySrc.push(path.join(rootPath,options.prettify.tmpDir,'**','*.html'));
    nonPrettifySrc.push(path.join(rootPath,options.prettify.tmpDir,'**','*'));
    nonPrettifySrc.push('!' + path.join(rootPath,options.prettify.tmpDir,'**','*.html'));
  }
  gulp.task('actless:prettify', function(){
    gulp.src(prettifySrc)
      .pipe(prettify(options.prettify.options))
      .pipe(gulp.dest(options.publicDir));
  });
  gulp.task('actless:nonPrettify', function(){
    gulp.src(nonPrettifySrc).pipe(gulp.dest(options.publicDir));
  });
  gulp.task('actless:prettify:watch',function(){
    watch(prettifySrc, function(){
      gulp.start('actless:prettify');
    })
    watch(nonPrettifySrc, function(){
      gulp.start('actless:nonPrettify');
    })
  });

  // test server
  var testUrl = url.format(options.server.url);
  gulp.task('actless:server:open', function(){
    open(testUrl);
  });

  if(options.server.type === 'node'){
    // test server(Nodejs)
    gulp.task('actless:server',function(){
      connect.server({
        root:path.join(rootPath,options.publicDir),
        port:options.server.url.port,
        livereload:options.server.livereload
      });
    });
    if(options.server.livereload){
      gulp.task('actless:server:livereload',function(){
        gulp.src(path.join(rootPath,options.publicDir,'**','*')).pipe(connect.reload());
      });
      gulp.task('actless:server:livereload:watch', function(){
        var timeoutId = null;
        watch([
          path.join(rootPath,options.publicDir,'**','*.css'),
          path.join(rootPath,options.publicDir,'**','*.js'),
          path.join(rootPath,options.publicDir,'**','*.html')
        ],function(){
            console.log(timeoutId);
            if(timeoutId){
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            timeoutId = setTimeout(function(){
              gulp.start('actless:server:livereload');
            },200);
        });
      });
    }
  }else if(options.server.type === 'php'){
    // test server(PHP)
    var cmd = 'php -S ' + options.server.hostname + ':' + options.server.url.port + ' -t' + path.join( rootPath, options.publicDir);
    gulp.task('actless:server', shell.task([ cmd ]));
  }else if(options.server.type === 'python'){
    // test server(Python)
    var cmd = 'pushd ' + path.join( rootPath, options.publicDir) + '; python -m SimpleHTTPServer ' + optiions.server.url.port + '; popd'
    gulp.task('server_py', shell.task([ cmd ]));
  }else if (options.server.type === 'gae'){
    // test server(GAE)
    var cmd = 'dev_appserver.py --port=' + options.server.url.port + ' ' + path.join( rootPath, options.publicDir);
  }


  gulp.task('actless:compile',['actless:sass','actless:wig','actless:prettify','actless:nonPrettify']);
  gulp.task('actless:compile-full',['actless:compile','actless:icons:tmp', 'actless:icons']);
  gulp.task('actless:watch',['actless:sass:watch','actless:wig:watch','actless:prettify:watch']);
  gulp.task('actless:watch-full',['actless:watch','actless:icons:watch']);
  var defaultTasks = ['actless:compile','actless:watch','actless:server','actless:server:open'];
  var fullTasks = ['actless:compile-full','actless:watch-full','actless:server','actless:server:open'];
  if(options.server.livereload){
    defaultTasks.push('actless:server:livereload');
    defaultTasks.push('actless:server:livereload:watch');
    fullTasks.push('actless:server:livereload');
    fullTasks.push('actless:server:livereload:watch');
  }
  gulp.task('actless:default', defaultTasks);
  gulp.task('actless:full', fullTasks);
  gulp.task('default',['actless:default']);
  gulp.task('full',['actless:full']);
}

module.exports = actless;
