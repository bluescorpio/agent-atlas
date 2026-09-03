import {
  JOB_STATUS_EXPIRED,
  JOB_STATUS_REJECTED,
  JOB_STATUS_SUBMITTED,
  POLL_INTERVAL_MS,
  POLL_MAX_ATTEMPTS,
} from './constants';

export type JobPollClient = {
  getJobStatus(jobId: bigint): Promise<number | string>;
  getDeliverableUrl(jobId: bigint): Promise<string | null>;
};

function statusCode(value: number | string): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const named: Record<string, number> = {
    OPEN: 0,
    FUNDED: 1,
    SUBMITTED: 2,
    COMPLETED: 3,
    REJECTED: 4,
    EXPIRED: 5,
  };
  const key = String(value).toUpperCase();
  if (key in named) return named[key];
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export type PollDeps = {
  sleep?: (ms: number) => Promise<void>;
  intervalMs?: number;
  maxAttempts?: number;
};

/**
 * Poll commerce until the job is SUBMITTED, then read `deliverable_url`.
 */
export async function pollUntilSubmitted(
  client: JobPollClient,
  jobId: bigint,
  deps: PollDeps = {},
): Promise<string> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const intervalMs = deps.intervalMs ?? POLL_INTERVAL_MS;
  const maxAttempts = deps.maxAttempts ?? POLL_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const raw = await client.getJobStatus(jobId);
    const status = statusCode(raw);
    if (status === JOB_STATUS_REJECTED) {
      throw new Error(`JOB_REJECTED: ${jobId.toString()}`);
    }
    if (status === JOB_STATUS_EXPIRED) {
      throw new Error(`JOB_EXPIRED: ${jobId.toString()}`);
    }
    if (status === JOB_STATUS_SUBMITTED || status === 3) {
      const url = await client.getDeliverableUrl(jobId);
      if (url) return url;
      throw new Error(`DELIVERABLE_URL_MISSING: job ${jobId.toString()} is SUBMITTED`);
    }
    await sleep(intervalMs);
  }
  throw new Error(`DELIVERY_TIMEOUT: job ${jobId.toString()} did not reach SUBMITTED`);
}
