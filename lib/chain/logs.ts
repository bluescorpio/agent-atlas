import type { AbiEvent, Address } from 'viem';
import { publicClient } from './client';

/** publicnode (and many free BSC RPCs) cap eth_getLogs at 50_000 blocks. */
export const RPC_LOG_CHUNK = BigInt(49_000);
export const HIRE_LOG_LOOKBACK = BigInt(1_000_000);
const MIN_LOG_CHUNK = BigInt(64);

export function isHistoryPrunedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /pruned|history has been pruned|block is out of range|from block is too old/i.test(message);
}

export async function getLogsChunked(query: {
  address: Address;
  event: AbiEvent;
  args?: object;
}, opts?: { lookback?: bigint; stopOnFirst?: boolean }): Promise<any[]> {
  const lookback = opts?.lookback ?? HIRE_LOG_LOOKBACK;
  const latest = await publicClient.getBlockNumber();
  const floor = latest > lookback ? latest - lookback : BigInt(0);
  const out: any[] = [];
  let span = RPC_LOG_CHUNK;
  let to = latest;
  while (to >= floor) {
    const rawFrom = to > span ? to - span : BigInt(0);
    const from = rawFrom < floor ? floor : rawFrom;
    try {
      const part = await publicClient.getLogs({
        address: query.address,
        event: query.event,
        args: query.args,
        fromBlock: from,
        toBlock: to,
      } as Parameters<typeof publicClient.getLogs>[0]);
      out.push(...part);
      if (opts?.stopOnFirst && part.length > 0) break;
      if (from === floor) break;
      to = from - BigInt(1);
    } catch (error) {
      if (!isHistoryPrunedError(error)) throw error;
      if (span <= MIN_LOG_CHUNK) break;
      span = span / BigInt(2);
    }
  }
  return out;
}
