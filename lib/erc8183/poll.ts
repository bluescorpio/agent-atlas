import {
  DELIVERABLE_URL_INTERVAL_MS,
  DELIVERABLE_URL_MAX_ATTEMPTS,
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
  urlAttempts?: number;
  urlIntervalMs?: number;
};

function usableUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed ? trimmed : null;
}

/**
 * After commerce reports SUBMITTED, keep reading `deliverable_url`.
 * JobSubmitted / policy logs can lag status by tens of seconds.
 */
async function waitForDeliverableUrl(
  client: JobPollClient,
  jobId: bigint,
  sleep: (ms: number) => Promise<void>,
  urlAttempts: number,
  urlIntervalMs: number,
): Promise<string> {
  for (let attempt = 0; attempt < urlAttempts; attempt += 1) {
    const url = usableUrl(await client.getDeliverableUrl(jobId));
    if (url) return url;
    if (attempt < urlAttempts - 1) await sleep(urlIntervalMs);
  }
  throw new Error(`DELIVERABLE_URL_MISSING: job ${jobId.toString()} is SUBMITTED`);
}

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
  const urlAttempts = deps.urlAttempts ?? DELIVERABLE_URL_MAX_ATTEMPTS;
  const urlIntervalMs = deps.urlIntervalMs ?? DELIVERABLE_URL_INTERVAL_MS;

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
      return waitForDeliverableUrl(client, jobId, sleep, urlAttempts, urlIntervalMs);
    }
    await sleep(intervalMs);
  }
  throw new Error(`DELIVERY_TIMEOUT: job ${jobId.toString()} did not reach SUBMITTED`);
}
