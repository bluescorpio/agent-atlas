import { parseUnits } from 'viem';
import { U_DECIMALS } from './constants';

/** Human $U amount from activate params (`0.1` → 1e17 wei). */
export function spendCapWei(params: Record<string, string>): bigint {
  const raw = (params.budgetCap || params.budget_cap || params.capital_cap || '').trim();
  if (!raw) throw new Error('SPEND_CAP_REQUIRED');
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('SPEND_CAP_INVALID');
  let wei: bigint;
  try {
    wei = parseUnits(raw, U_DECIMALS);
  } catch {
    throw new Error('SPEND_CAP_INVALID');
  }
  if (wei <= BigInt(0)) throw new Error('SPEND_CAP_INVALID');
  return wei;
}

/**
 * Quote must not exceed the user-set cap. Approve floor is the quote itself
 * (never a blanket 100-token SDK default, never above the cap).
 */
export function exactApproveFloor(quoteWei: bigint, capWei: bigint): bigint {
  if (quoteWei <= BigInt(0)) throw new Error('NEGOTIATED_PRICE_INVALID');
  if (quoteWei > capWei) {
    throw new Error(`SPEND_CAP_EXCEEDED: quote ${quoteWei.toString()} wei exceeds cap ${capWei.toString()} wei`);
  }
  return quoteWei;
}
