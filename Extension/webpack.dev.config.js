const config = require('./webpack.config');

config.mode = 'development';
config.devtool = 'inline-source-map';
config.watch = true;
module.exports = config;
