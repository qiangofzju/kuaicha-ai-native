/** @type {import('next').NextConfig} */
const nextConfig = {
  // Separate dist dirs for dev/build to avoid chunk corruption when both run.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
