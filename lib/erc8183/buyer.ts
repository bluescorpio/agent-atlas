import { ERC8183Client } from '@bnbagent/sdk/erc8183';
import { EVMWalletProvider } from '@bnbagent/sdk/wallets';
import { ERC8183_NETWORK } from './constants';

export function buyerWallet() {
  const privateKey = process.env.ERC8183_BUYER_PRIVATE_KEY;
  if (!privateKey) throw new Error('ERC8183_BUYER_PRIVATE_KEY_REQUIRED');
  return new EVMWalletProvider({
    password: process.env.ERC8183_BUYER_KEYSTORE_PASSWORD || 'atlas-ephemeral',
    privateKey,
    persist: false,
  });
}

export async function defaultBuyerClient(wallet: { address: string }) {
  if (!process.env.RPC_URL && (process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL_BSC_TESTNET)) {
    process.env.RPC_URL = process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL_BSC_TESTNET;
  }
  return ERC8183Client.create({
    walletProvider: wallet as EVMWalletProvider,
    network: ERC8183_NETWORK,
  });
}
