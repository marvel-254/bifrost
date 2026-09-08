const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: [
    '@bifrost/models',
    '@bifrost/providers',
    '@bifrost/routing',
    '@bifrost/shared',
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@bifrost/shared': path.join(__dirname, '../../packages/shared/src'),
      '@bifrost/models': path.join(__dirname, '../../packages/models/src'),
      '@bifrost/providers': path.join(__dirname, '../../packages/providers/src'),
      '@bifrost/routing': path.join(__dirname, '../../packages/router/src'),
    };
    return config;
  },
};

module.exports = nextConfig;
