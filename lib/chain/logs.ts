import type { AbiEvent, Address } from 'viem';
import { publicClient } from './client';

/** publicnode (and many free BSC RPCs) cap eth_getLogs at 50_000 blocks. */
export const RPC_LOG_CHUNK = BigInt(49_000);
export const HIRE_LOG_LOOKBACK = BigInt(1_000_000);

export async function getLogsChunked(query: {
  address: Address;
  event: AbiEvent;
  args?: object;
}, opts?: { lookback?: bigint; stopOnFirst?: boolean }): Promise<any[]> {
  const lookback = opts?.lookback ?? HIRE_LOG_LOOKBACK;
  const latest = await publicClient.getBlockNumber();
  const floor = latest > lookback ? latest - lookback : BigInt(0);
  const out: any[] = [];
  for (let to = latest; to >= floor; ) {
    const rawFrom = to > RPC_LOG_CHUNK ? to - RPC_LOG_CHUNK : BigInt(0);
    const from = rawFrom < floor ? floor : rawFrom;
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
  }
  return out;
}
