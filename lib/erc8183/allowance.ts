import { getAddress, erc20Abi, isAddress } from 'viem';
import { publicClient } from '../chain/client';
import { ERC8183_CHAIN_ID, ERC8183_COMMERCE, U_TOKEN } from './constants';

export type AllowanceSnapshot = {
  chainId: number;
  token: typeof U_TOKEN;
  spender: typeof ERC8183_COMMERCE;
  owner: `0x${string}`;
  allowanceWei: string;
};

export async function readCommerceAllowance(wallet: string): Promise<AllowanceSnapshot> {
  if (!isAddress(wallet)) throw new Error('WALLET_INVALID');
  const owner = getAddress(wallet);
  const allowance = await publicClient.readContract({
    address: U_TOKEN,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, ERC8183_COMMERCE],
  });
  return {
    chainId: ERC8183_CHAIN_ID,
    token: U_TOKEN,
    spender: ERC8183_COMMERCE,
    owner,
    allowanceWei: allowance.toString(),
  };
}
