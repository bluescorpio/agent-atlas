import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: bsc,
  transport: http(process.env.BSC_RPC_URL || undefined),
});
