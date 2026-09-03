import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@bnbagent/sdk'],
};
export default nextConfig;
