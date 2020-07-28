const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');


module.exports = {
  // devtool: 'source-map',
  entry: {
    content: './js/contentScript.js',
    contentNetflix: './js/contentScriptNetflix.js',
    contentHotstar: './js/contentScriptHotstar.js',
    // popup: './js/popup.js',
    // background: './js/background.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].js',
  },
  context: path.join(__dirname, 'src'),

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.html$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'html-loader',
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.less$/,
        use: [{
          loader: 'style-loader',
        }, {
          loader: 'css-loader', // translates CSS into CommonJS
        }, {
          loader: 'less-loader', // compiles Less to CSS
          options: {
            lessOptions: {
              modifyVars: {
                'primary-color': '#EB2F96',
                'link-color': '#EB2F96',
                'border-radius-base': '1px',
              },
              javascriptEnabled: true,
            },
          },
        }],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader',
        ],
      },
      {
        parser: {
          amd: false,
        },
      },
    ],
  },
  plugins: [
    // Clean build folder
    new CleanWebpackPlugin(),

    // Copy images and css files
    new CopyWebpackPlugin({
      patterns: [
        { from: 'chrome/img', to: 'img' },
        // { from: '*.html' },
        { from: 'js/background.js', to: 'js' },
        { from: 'chrome/manifest.json' },
      ],
    }),
  ],
};
