import { getAddress } from 'viem';
import { JOB_STATUS_SUBMITTED } from './constants';
import type { JobPollClient } from './poll';

const LOOKBACK_JOBS = 64;

export type ResumeClient = JobPollClient & {
  getJob?: (jobId: bigint) => Promise<{
    client?: string;
    provider?: string;
    status?: number | string;
  }>;
  commerce?: { jobCounter?: () => Promise<bigint> };
};

/**
 * Return the newest SUBMITTED hire for this buyer+provider that already has a
 * readable deliverable_url. Used so a retry of /api/activate does not spend
 * another 0.1 U or return 400 after the chain already delivered.
 */
export async function findReadableSubmittedJob(
  client: ResumeClient,
  buyer: string,
  provider: string,
): Promise<{ jobId: string; deliverableUrl: string } | null> {
  if (typeof client.getJob !== 'function' || typeof client.commerce?.jobCounter !== 'function') {
    return null;
  }
  let counter: bigint;
  try {
    counter = BigInt(await client.commerce.jobCounter());
  } catch {
    return null;
  }
  if (counter <= BigInt(0)) return null;

  const buyerAddr = getAddress(buyer);
  const providerAddr = getAddress(provider);
  const last = counter;
  const lookback = BigInt(LOOKBACK_JOBS);
  const first = last > lookback ? last - lookback + BigInt(1) : BigInt(1);

  for (let id = last; id >= first; id -= BigInt(1)) {
    try {
      const job = await client.getJob(id);
      if (!job?.client || !job?.provider) continue;
      if (getAddress(job.client) !== buyerAddr) continue;
      if (getAddress(job.provider) !== providerAddr) continue;
      const status = Number(job.status);
      if (status !== JOB_STATUS_SUBMITTED && status !== 3) continue;
      const url = await client.getDeliverableUrl(id);
      if (typeof url === 'string' && url.trim()) {
        return { jobId: id.toString(), deliverableUrl: url.trim() };
      }
    } catch {
      continue;
    }
  }
  return null;
}
