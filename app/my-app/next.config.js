/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // This will help catch infinite loops and other issues
  experimental: {
    // Enable more detailed error reporting
    optimizePackageImports: ['viem']
  }
};

module.exports = nextConfig;
