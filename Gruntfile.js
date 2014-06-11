module.exports = function(grunt) {
  'use strict';
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    requirejs: {
        compile: {
            options: {
                baseUrl: "./",
                paths: {
                    'mockup-patterns-base': 'bower_components/mockup-core/js/pattern',
                    'mockup-registry': 'bower_components/mockup-core/js/registry',
                    'jquery': 'bower_components/jquery/jquery',
                    'mosaic.tinymce': 'src/plone/app/mosaic/browser/javascripts/tinymce/tiny_mce_mosaic',
                    'mosaic.core': 'src/plone/app/mosaic/browser/javascripts/mosaic.core',
                    'mosaic.overlay': 'src/plone/app/mosaic/browser/javascripts/mosaic.overlay',
                    'mosaic.layout': 'src/plone/app/mosaic/browser/javascripts/mosaic.layout',
                    'mosaic.toolbar': 'src/plone/app/mosaic/browser/javascripts/mosaic.toolbar',
                    'mosaic.actions': 'src/plone/app/mosaic/browser/javascripts/mosaic.actions',
                    'mosaic.upload': 'src/plone/app/mosaic/browser/javascripts/mosaic.upload',
                    'mosaic.undo': 'src/plone/app/mosaic/browser/javascripts/mosaic.undo',
                    'mosaic.editor': 'src/plone/app/mosaic/browser/javascripts/mosaic.editor',
                    'mosaic.overlaytriggers': 'src/plone/app/mosaic/browser/javascripts/mosaic.overlaytriggers',
                    'requirejs': 'bower_components/requirejs/require'
                },
                shim: {
                    'mockup-registry': {exports: 'window.Registry'},
                    'mosaic.core': {exports: 'window.Mosaic'}
                },
                name: "src/plone/app/mosaic/browser/javascripts/mosaic.pattern",
                out: "src/plone/app/mosaic/browser/javascripts/bundle/mosaic.js",
                optimize: "none"
            }
        }
    },
    watch: {
        scripts: {
            files: ['src/plone/app/mosaic/browser/javascripts/*.js'],
            tasks: ['requirejs']
        }
    },
    jshint: { options: { jshintrc: '.jshintrc' }, all: ['src/plone/app/mosaic/browser/javascripts/*.js', 'tests/*.js'] },
    jscs: { options: { config: '.jscs.json' }, all: ['src/plone/app/mosaic/browser/javascripts/*.js', 'tests/*.js'] },
    karma: {
      options: {
        basePath: './tests/',
        frameworks: [],
        files: ['*.js'],
        preprocessors: { 'src/plone/app/mosaic/browser/javascripts/**/*.js': 'coverage' },
        reporters: ['dots', 'progress', 'coverage'],
        coverageReporter: { type : 'lcov', dir : 'coverage/' },
        port: 9876,
        colors: true,
        logLevel: 'DEBUG',
        browserNoActivityTimeout: 200000,
        autoWatch: true,
        captureTimeout: 60000,
        plugins: [
          'karma-mocha',
          'karma-coverage',
          'karma-requirejs',
          'karma-sauce-launcher',
          'karma-chrome-launcher',
          'karma-phantomjs-launcher',
          'karma-junit-reporter'
        ]
      },
      test: {
        browsers: ['PhantomJS']
      },
      testOnce: {
        singleRun: true,
        browsers: ['PhantomJS']
      },
      testDev: {
        browsers: ['Chrome'],
        preprocessors: {},
        reporters: ['dots', 'progress'],
        plugins: [
          'karma-mocha',
          'karma-requirejs',
          'karma-chrome-launcher',
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-jscs-checker');
  grunt.loadNpmTasks('grunt-karma');

  // grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

  grunt.registerTask('test', ['jshint', 'jscs', 'karma:test']);
  grunt.registerTask('default', ['watch']);
};

