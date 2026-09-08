import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Help Vercel's pnpm-based build find workspace packages
  outputFileTracingRoot: root,
  transpilePackages: [
    '@bifrost/models',
    '@bifrost/providers',
    '@bifrost/routing',
    '@bifrost/shared',
    '@bifrost/compression',
    '@bifrost/cache',
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@bifrost/shared': path.join(root, 'packages/shared/src'),
      '@bifrost/models': path.join(root, 'packages/models/src'),
      '@bifrost/providers': path.join(root, 'packages/providers/src'),
      '@bifrost/routing': path.join(root, 'packages/router/src'),
      '@bifrost/compression': path.join(root, 'packages/compression/src'),
      '@bifrost/cache': path.join(root, 'packages/cache/src'),
    };
    return config;
  },
};

export default nextConfig;
