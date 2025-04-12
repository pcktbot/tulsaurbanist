const path = require('path');
const { EsbuildPlugin } = require('esbuild-loader');

/** @type {import('webpack').Configuration} */
const config = {
  entry: {
    application: './app/javascript/packs/application.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'app/assets/builds'),
    publicPath: '/assets/',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    modules: [
      path.resolve(__dirname, 'app/javascript'),
      'node_modules'
    ]
  },
  module: {
    rules: [{
      test: /\.ts$/,
      loader: 'esbuild-loader',
      options: {loader: 'ts', target: 'es2015'}
    }]
  },
  plugins: [new EsbuildPlugin()],
  mode: 'development',
  devServer: {
    contentBase: path.resolve(__dirname, 'public'),
    publicPath: '/assets/',
    compress: true,
    port: 3035,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
};

module.exports = config;