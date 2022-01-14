const webpack = require('webpack');
const path = require('path');
const merge = require('webpack-merge');

const PlonePlugin = require('plonetheme-webpack-plugin');

const SITENAME = process.env.SITENAME || 'Plone';
const THEMENAME = process.env.THEMENAME || 'plone-mosaic';

const PATHS = {
  src: path.join(__dirname, 'resources', 'src', THEMENAME),
  build: path.join(__dirname, 'resources', 'theme', THEMENAME),
  mosaic: path.join(
    __dirname, 'src', 'plone', 'app', 'mosaic', 'browser', 'static')
};

const PLONE = new PlonePlugin({
  portalUrl: 'http://localhost:8080/' + SITENAME,
  publicPath: '/' + SITENAME + '/++theme++' + THEMENAME + '/',
  sourcePath: PATHS.src,
  debug: true  // disable for more quiet output
});

const common = {
  entry: {
   'default': path.join(PATHS.src, 'default'),
   'logged-in': path.join(PATHS.src, 'logged-in')
  },
  output: {
    path: PATHS.build
  },
  devServer: {
    outputPath: PATHS.build
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    alias: {
      'react': 'react',  // override react shipped in Plone (example)
      'mosaic': path.join(PATHS.mosaic, 'js', 'mosaic.pattern'), // Mosaic FS
      'mosaic-url': path.join(PATHS.mosaic, 'js'),
      'mosaic-base-url': path.join(PATHS.mosaic, 'js')
    }
  },
  module: {
    loaders: [
      { test: /\.jsx?$/,
        loaders: ['babel?cacheDirectory'],
        include: PATHS.src }
    ]
  }
};

switch(path.basename(process.argv[1])) {
  case 'webpack':
    module.exports = merge(PLONE.production, common, {
      resolve: {
        alias: {
          'react': 'react-lite',  // (example)
          'react-dom': 'react-lite'  // (example)
        }
      }
    });
    break;

  case 'webpack-dev-server':
    module.exports = merge(PLONE.development, common, {
      entry: [
        path.join(PATHS.src, 'default'),
        path.join(PATHS.src, 'logged-in')
      ]
    });
    break;
}
