import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle workspace packages and create standalone output for Docker
  output: 'standalone',
  transpilePackages: [
    '@dashtec/database',
    '@dashtec/shared-types',
    '@dashtec/shared-utils',
    '@dashtec/logger',
  ],
  env: {
    ETHEREUM_EXPLORER_URL: process.env.ETHEREUM_EXPLORER_URL,
    NEXT_PUBLIC_NETWORK_TYPE: process.env.CHAIN_NAME ?? 'mainnet',
  },
  async rewrites() {
    return [
      {
        source: '/sequencers',
        destination: '/validators',
      },
      {
        source: '/sequencers/:path*',
        destination: '/validators/:path*',
      },
      {
        source: '/api/sequencers',
        destination: '/api/validators',
      },
      {
        source: '/api/sequencers/:path*',
        destination: '/api/validators/:path*',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/validators',
        destination: '/sequencers',
        permanent: true,
      },
      {
        source: '/validators/:path*',
        destination: '/sequencers/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;