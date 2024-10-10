import * as path from 'path';
import {EsbuildPlugin} from 'esbuild-loader';
import {Configuration} from 'webpack';

const config: Configuration = {
  entry:    {application: './app/javascript/application.ts',
            },
  output:   {filename: '[name].js',
             path: path.resolve(__dirname, 'app/assets/builds')
            },
  resolve:  {extensions: ['.ts', '.js'],
             modules:    [path.resolve(__dirname, 'app/javascript'),
                         'node_modules']
            },
  module:   {rules: [{test: /\.ts$/,
                      loader: 'esbuild-loader',
                      options: {loader: 'ts', target: 'es2015'}
                    }]
            },
  plugins:  [new EsbuildPlugin()],
  mode:     'development',
};

export default config;
