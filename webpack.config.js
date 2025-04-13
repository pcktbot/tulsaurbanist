const path = require('path');
const { EsbuildPlugin } = require('esbuild-loader');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

/** @type {import('webpack').Configuration} */
const config = {
  entry: {
    application: './app/javascript/packs/application.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'public/packs'),
    publicPath: '/packs/',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    modules: [
      path.resolve(__dirname, 'app/javascript'),
      'node_modules'
    ]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: /node_modules\/@hotwired/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      },
      {
        test: /\.(ts|js)$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'ts',
          target: 'es2020',
          tsconfigRaw: require('./tsconfig.json')
        }
      }
    ]
  },
  plugins: [
    new EsbuildPlugin(),
    new WebpackManifestPlugin({
      publicPath: '/packs/',
      writeToFileEmit: true      
    })
  ],
  mode: 'development',
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public'),
      publicPath: '/packs/'
    },
    compress: true,
    port: 3035,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
};

module.exports = config;