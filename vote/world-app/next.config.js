/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    optimizePackageImports: ['viem'],
  },

  // Server external packages
  serverExternalPackages: [],

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Enable compression
    compress: true,
    // Optimize images
    images: {
      domains: [],
      formats: ['image/webp', 'image/avif'],
    },
    // Enable static optimization
    trailingSlash: false,
    // Security headers for production
    poweredByHeader: false,
  }),

  // Development-specific configurations
  ...(process.env.NODE_ENV === 'development' && {
    // Enable source maps for better debugging
    productionBrowserSourceMaps: false,

    // Enable detailed webpack stats
    webpack: (config, { dev, isServer }) => {
      if (dev) {
        // Add debugging info for server-side code
        if (isServer) {
          console.log('🔧 Webpack building server-side code with debugging enabled');
        }
      }

      return config;
    },

    // Handle ngrok tunneling in development
    allowedDevOrigins: [
      'pet-jackal-crucial.ngrok-free.app',
      'localhost:3000',
      '127.0.0.1:3000',
    ],
  }),

  // Headers for CORS and security
  async headers() {
    const headers = [
      {
        source: '/api/:path*',
        headers: [
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

    // Add development-specific headers
    if (process.env.NODE_ENV === 'development') {
      headers[0].headers.push(
        {
          key: 'X-Debug-Mode',
          value: 'true',
        },
        {
          key: 'X-Timestamp',
          value: new Date().toISOString(),
        }
      );
    }

    // Add production security headers
    if (process.env.NODE_ENV === 'production') {
      headers.push({
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      });
    }

    return headers;
  },
};

module.exports = nextConfig;
