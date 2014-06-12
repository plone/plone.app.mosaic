module.exports = function(grunt) {
  'use strict';
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    requirejs: {
        compile: {
            options: {
                baseUrl: "src/plone/app/mosaic/browser/javascripts/",
                paths: {
                    'mosaic.tinymce': 'tinymce/tiny_mce_mosaic'
                },
                name: "mosaic.core",
                include: [
                    'mosaic.actions',
                    'mosaic.editor',
                    'mosaic.layout',
                    'mosaic.overlay',
                    'mosaic.overlaytriggers',
                    'mosaic.tinymce',
                    'mosaic.toolbar',
                    'mosaic.undo',
                    'mosaic.upload',
                ],
                out: "src/plone/app/mosaic/browser/javascripts/bundle/mosaic.js",
                optimize: "none"
            }
        }
    },
    watch: {
        scripts: {
            files: ['src/plone/app/mosaic/browser/javascripts/*.js'],
            tasks: ['requirejs', 'concat:bundle']
        }
    },

    concat: {
      bundle: {
          options: {
              separator: '\n\n',
          },
          src: [
            "src/plone/app/mosaic/browser/javascripts/bundle/mosaic.js",
            "src/plone/app/mosaic/browser/javascripts/mosaic.pattern.js"
          ],
          dest: "src/plone/app/mosaic/browser/javascripts/bundle/mosaic.js"
      },
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
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-jscs-checker');
  grunt.loadNpmTasks('grunt-karma');

  // grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

  grunt.registerTask('test', ['jshint', 'jscs', 'karma:test']);
  grunt.registerTask('default', ['watch']);
};

