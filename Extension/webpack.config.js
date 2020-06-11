const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');


module.exports = {
  entry: {
    content: './js/contentScript.js',
    popup: './js/popup.js',
    background: './js/background.js',
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
        use: [
          'style-loader',
          'css-loader',
        ],
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
        // { from: 'chrome/css', to: 'css' },
        { from: '*.html' },
        { from: 'chrome/manifest.json' },
      ],
    }),
  ],
};
