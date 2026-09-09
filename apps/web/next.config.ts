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
    // Next's `env` block wins over .env files, so whatever is computed here is
    // the value baked into the client bundle.
    //
    // This used to read CHAIN_NAME alone, which silently discarded the
    // NEXT_PUBLIC_NETWORK_TYPE that env:propagate writes into
    // apps/web/.env.build.<network>. CHAIN_NAME is a *runtime* variable
    // (.env.<network>) that next build never loads, so the value fell through to
    // whatever a leftover apps/web/.env happened to hold — on the deployed host
    // that was a stale CHAIN_NAME="sepolia" from an old release, which is why the
    // mainnet build shipped with Sepolia selected in the network switcher.
    //
    // Prefer the explicit build-time variable; keep CHAIN_NAME as a fallback for
    // local runs that only set it.
    NEXT_PUBLIC_NETWORK_TYPE:
      process.env.NEXT_PUBLIC_NETWORK_TYPE ?? process.env.CHAIN_NAME ?? 'mainnet',
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