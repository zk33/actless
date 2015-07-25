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

var options ={
  publicDir:'public',
  sass:{
    srcDir: 'assets/sass',
    destDir: 'public/assets/css',
    style:'compact',
    loadPath:[
      __dirname + '/node_modules/actless/sass',
      __dirname + '/node_modules/bootstrap-sass/assets/stylesheets',
      __dirname + '/node_modules/sanitize.css',
      __dirname + '/bower_components/csswizardry-grids'
    ],
    prefixer:{
      browsers:['last 2 versions','> 4%']
    }
  },
  icon:{
    srcDir: 'assets/icons'
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
  }
}

var actless = {};

actless.options = options;

actless.initTasks = function(gulp,rootPath){
  // compile sass (+ autoprefixer) =======
  gulp.task('actless:sass', function(){
    var g = gulp.src( path.join(rootPath , options.sass.srcDir))
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
    watch(path.join(rootPath, options.sass.srcDir), function(){
      gulp.start('sass');
    });
  });

  // compile icons with fontcustom
  gulp.task('actless:icons', shell.task([
    'fontcustom compile'
  ]));
  gulp.task('actless:icons:watch',function(){
    watch(path.join(rootPath,options.icons.srcDir), function(){
      gulp.start('actless:icons');
    });
  });

  // wig ==========================
  var wigOpt = _.assign({},options.wig);
  wigOpt.rootDir = rootPath;
  if(!_.isArray(wigOpt.tmplDir)){
    wigOpt.tmplDir = [wigOpt.tmplDir];
  }
  wigOpt.tmplDir.push( path.join(rootPath,'templates') );
  var builder = new Wig(wigOpt);
  gulp.task('actless:wig', function(){
    try{
      builder.build();
    }catch(e){
      console.log(e);
    }
  });
  var wigWatchSrc = [
    path.join(rootPath,wigOpt.dataDir,'**','*'),
    path.join(rootPath,options.wig.tmplDir,'**','*')
  ]
  gulp.task('actless:wig:watch',function(){
    watch(wigWatchSrc, function(){
      gulp.start('actless:wig');
    });
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
        gulp.src(path.join(rootPath,options.publicDir) + '**/*.html').pipe(connect.reload());
      });
      gulp.task('actless:server:livereload:watch', function(){
        gulp.watch([
          path.join(rootPath,options.publicDir) + '**/*.css',
          path.join(rootPath,options.publicDir) + '**/*.js',
          path.join(rootPath,options.publicDir) + '**/*.html'
        ],'actless:server:livereload:watch');
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


  gulp.task('actless:compile',['actless:sass','actless:wig']);
  gulp.task('actless:compile-full',['actless:compile','icons']);
  gulp.task('actless:watch',['actless:sass:watch','actless:wig:watch']);
  gulp.task('actless:watch-full',['actless:watch','actless:icons:watch']);
  gulp.task('actless:default',['actless:compile','actless:watch','actless:server','actless:server:open']);
  gulp.task('default',['actless:default']);
}

module.exports = actless;
