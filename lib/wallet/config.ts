import { createConfig, http } from 'wagmi';
import { bscTestnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
const rpc = process.env.NEXT_PUBLIC_BSC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com';
export const wagmiConfig = createConfig({
  chains: [bscTestnet],
  connectors: [injected(), ...(projectId ? [walletConnect({ projectId })] : [])],
  transports: { [bscTestnet.id]: http(rpc) },
});
