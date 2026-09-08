/** @type {import('next').NextConfig} */
const nextConfig = {
  // Both API routes and dashboard share this Next.js app
  // Type checking done separately via `pnpm typecheck`
  typescript: {
    ignoreBuildErrors: true,
  },
  // Critical: explicit distDir so Vercel finds the build output in the monorepo.
  // The @vercel/next build worker runs from the project root, but Next.js builds
  // into apps/api/.next. Without this, Vercel can't find the routes manifest.
  distDir: 'apps/api/.next',
};

export default nextConfig;
