import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

export const CHAIN_ID = 97;

export function getRpcUrl(): string {
  return process.env.BSC_TESTNET_RPC_URL
    || process.env.RPC_URL
    || process.env.BSC_RPC_URL
    || process.env.NEXT_PUBLIC_BSC_RPC_URL
    || 'https://bsc-testnet-rpc.publicnode.com';
}

export const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(getRpcUrl()),
});
