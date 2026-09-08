/** @type {import('next').NextConfig} */
const nextConfig = {
  // API routes are serverless functions on Vercel
  // Type checking is done separately via `pnpm typecheck`
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
