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

  // Headers for better debugging and CORS handling
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
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      },
    ];
  },

  // Handle ngrok tunneling
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: [
      'pet-jackal-crucial.ngrok-free.app',
      'localhost:3000',
      '127.0.0.1:3000',
    ],
  }),
};

module.exports = nextConfig;
