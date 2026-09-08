/** @type {import('next').NextConfig} */
const nextConfig = {
  // Both API routes and dashboard share this Next.js app
  // Type checking done separately via `pnpm typecheck`
  typescript: {
    ignoreBuildErrors: true,
  },
  // Standalone output for Vercel serverless deployment
  output: 'standalone',
};

export default nextConfig;
