import path from 'node:path';
import type { NextConfig } from 'next';

/** Optional wagmi connector peers. Webpack treats them as missing; we do not use those wallets. */
const optionalWagmiPeers: Record<string, false> = {
  '@base-org/account': false,
  '@coinbase/wallet-sdk': false,
  '@metamask/connect-evm': false,
  '@safe-global/safe-apps-provider': false,
  '@safe-global/safe-apps-sdk': false,
  '@walletconnect/ethereum-provider': false,
  accounts: false,
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Nested agents/*/pnpm-lock.yaml made Next pick a parent lockfile as workspace root.
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['@bnbagent/sdk'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...optionalWagmiPeers,
    };
    return config;
  },
};
export default nextConfig;
