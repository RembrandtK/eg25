/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // This will help catch infinite loops and other issues

  experimental: {
    // Enable more detailed error reporting
    optimizePackageImports: ['viem'],
    // Enable server-side debugging
    serverComponentsExternalPackages: [],
  },

  // Enable detailed logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Development-specific configurations
  ...(process.env.NODE_ENV === 'development' && {
    // Enable source maps for better debugging
    productionBrowserSourceMaps: false,

    // Enable detailed webpack stats
    webpack: (config, { dev, isServer }) => {
      if (dev) {
        // Enable source maps
        config.devtool = 'eval-source-map';

        // Add debugging info for server-side code
        if (isServer) {
          console.log('🔧 Webpack building server-side code with debugging enabled');
        }
      }

      return config;
    },
  }),

  // Headers for better debugging
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Debug-Mode',
            value: process.env.NODE_ENV === 'development' ? 'true' : 'false',
          },
          {
            key: 'X-Timestamp',
            value: new Date().toISOString(),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
