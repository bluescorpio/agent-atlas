import { NextResponse } from 'next/server';
import { getAddress, isAddress, parseAbiItem } from 'viem';
import { getLogsChunked, HIRE_LOG_LOOKBACK, RPC_LOG_CHUNK } from '../../../lib/chain/logs';
import { ERC8183_COMMERCE } from '../../../lib/erc8183/constants';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Event signatures from CURSOR_TASKS.md §2.4 — not inferred. */
const JOB_CREATED = parseAbiItem(
  'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt, address hook)',
);
const JOB_FUNDED = parseAbiItem(
  'event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)',
);
const JOB_SUBMITTED = parseAbiItem(
  'event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable)',
);

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get('wallet');
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: 'wallet query must be a 0x address' }, { status: 400 });
  }
  const client = getAddress(wallet);
  try {
    const [created, funded] = await Promise.all([
      getLogsChunked({
        address: ERC8183_COMMERCE,
        event: JOB_CREATED,
        args: { client },
      }),
      getLogsChunked({
        address: ERC8183_COMMERCE,
        event: JOB_FUNDED,
        args: { client },
      }),
    ]);
    const fundedIds = new Set(funded.map((log) => (log.args.jobId ?? BigInt(0)).toString()));
    const hires = created.map((log) => {
      const jobId = (log.args.jobId ?? BigInt(0)).toString();
      return {
        jobId,
        client: log.args.client,
        provider: log.args.provider,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        fundedInWindow: fundedIds.has(jobId),
      };
    });
    const latest = created[0]?.blockNumber ?? funded[0]?.blockNumber;
    return NextResponse.json({
      chainId: 97,
      commerce: ERC8183_COMMERCE,
      wallet: client,
      lookbackBlocks: HIRE_LOG_LOOKBACK.toString(),
      chunkBlocks: RPC_LOG_CHUNK.toString(),
      latestTouchedBlock: latest?.toString() ?? null,
      logWindowNote: 'eth_getLogs paged in ≤49k-block chunks (publicnode cap 50k). If the RPC pruned older blocks, the window stops at the newest readable range instead of 503. FUNDED vs SUBMITTED is only from events in this window.',
      count: hires.length,
      hires,
      submittedProbe: JOB_SUBMITTED.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HIRE_LOGS_FAILED';
    return NextResponse.json({
      error: message,
      chainId: 97,
      commerce: ERC8183_COMMERCE,
      wallet: client,
    }, { status: 503 });
  }
}
