import { getAddress } from 'viem';
import { ERC8183_CHAIN_ID, ERC8183_COMMERCE, U_TOKEN } from './constants';
import { buyerWallet, defaultBuyerClient } from './buyer';
import type { Erc8183ActivateDeps } from './activate';

export type RevokeAllowanceResult = {
  chainId: number;
  token: typeof U_TOKEN;
  spender: typeof ERC8183_COMMERCE;
  owner: `0x${string}`;
  previousAllowanceWei: string;
  allowanceWei: string;
  txHash: `0x${string}` | null;
  skipped: boolean;
};

/**
 * Set $U allowance of the ERC-8183 commerce contract to 0.
 * Spender is commerce (SDK `fund` approves `this.commerce.address`).
 */
export async function revokeCommerceAllowance(
  wallet: string,
  deps: Erc8183ActivateDeps = {},
): Promise<RevokeAllowanceResult> {
  const buyer = deps.createWallet?.() ?? buyerWallet();
  try {
    if (getAddress(wallet) !== getAddress(buyer.address)) {
      throw new Error('WALLET_MISMATCH');
    }
    const createClient = deps.createClient ?? defaultBuyerClient;
    const client = await createClient(buyer);
    if (getAddress(client.network.commerceContract) !== getAddress(ERC8183_COMMERCE)) {
      throw new Error(`ERC8183_COMMERCE_MISMATCH: expected ${ERC8183_COMMERCE}`);
    }
    const previous = await client.tokenAllowance(buyer.address, ERC8183_COMMERCE);
    if (previous === BigInt(0)) {
      return {
        chainId: ERC8183_CHAIN_ID,
        token: U_TOKEN,
        spender: ERC8183_COMMERCE,
        owner: getAddress(buyer.address),
        previousAllowanceWei: '0',
        allowanceWei: '0',
        txHash: null,
        skipped: true,
      };
    }
    const tx = await client.approvePaymentToken(ERC8183_COMMERCE, BigInt(0));
    const hash = tx.transactionHash ?? tx.txHash;
    if (typeof hash !== 'string' || !hash.startsWith('0x')) {
      throw new Error('ERC8183_REVOKE_TX_MISSING');
    }
    return {
      chainId: ERC8183_CHAIN_ID,
      token: U_TOKEN,
      spender: ERC8183_COMMERCE,
      owner: getAddress(buyer.address),
      previousAllowanceWei: previous.toString(),
      allowanceWei: '0',
      txHash: hash as `0x${string}`,
      skipped: false,
    };
  } finally {
    buyer.destroy?.();
  }
}
