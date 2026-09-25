import { createConfig, http } from 'wagmi';
import { bscTestnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors/injected';

const rpc = process.env.NEXT_PUBLIC_BSC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
export const wagmiConfig = createConfig({
  chains: [bscTestnet],
  connectors: [injected()],
  transports: { [bscTestnet.id]: http(rpc) },
});
