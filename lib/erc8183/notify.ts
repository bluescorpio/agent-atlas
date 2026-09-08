import type { AgentListing } from '../types';
import { sendA2aData } from './a2a';

export type NotifyFundedAck = {
  status: string;
  job_id: string;
  raw: Record<string, unknown>;
};

/**
 * A2A `notify_funded` with the on-chain job id. Seller acks immediately and
 * delivers in the background; the deliverable is read from chain later.
 */
export async function notifyFunded(
  agent: AgentListing,
  jobId: bigint,
  fetchImpl: typeof fetch = fetch,
): Promise<NotifyFundedAck> {
  const endpoint = agent.identity.endpoint;
  if (!endpoint) throw new Error('AGENT_ENDPOINT_REQUIRED');
  const data = await sendA2aData(
    endpoint,
    {
      skill: 'notify_funded',
      job_id: Number(jobId),
    },
    fetchImpl,
    agent.identity.agentId,
  );
  const status = String(data.status ?? '');
  if (status !== 'accepted') {
    throw new Error(`NOTIFY_FUNDED_REJECTED: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return {
    status,
    job_id: String(data.job_id ?? jobId.toString()),
    raw: data,
  };
}
