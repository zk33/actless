#!/usr/bin/env node

'use strict';

var path = require('path');

var ncp = require('ncp');
var cli = require('commander');
cli.version('0.1.0-beta0');


cli.command('init')
  .description('Initialize directories, gulpfile for using actless')
  .action(function(cmd){
    var cwd = process.cwd();
    ncp(
      path.join(__dirname,'templates'), 
      cwd,
      { clobber:true },
      function(err){
        if(err){
          return console.error(err);
        }
        console.log('done!');
      }
    );
  });

cli.parse(process.argv);
