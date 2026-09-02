import { createConfig, http } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
export const wagmiConfig = createConfig({
  chains: [bsc],
  connectors: [injected(), ...(projectId ? [walletConnect({ projectId })] : [])],
  transports: { [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL || undefined) },
});
