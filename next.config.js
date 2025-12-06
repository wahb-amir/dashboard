const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpackDevMiddleware: config => {
    config.watchOptions = {
      poll: 1000,             // poll every second
      aggregateTimeout: 300,  // batch changes
      ignored: ['node_modules'], // ignore node_modules
    };
    return config;
  },
  watchFolders: [
    path.resolve(__dirname, '../../packages'), 
  ],
};

module.exports = nextConfig;
