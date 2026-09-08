import type { AgentListing } from '../types';
import { sendA2aData } from './a2a';
import { extractNegotiationEnvelope, type NegotiationEnvelope } from './envelope';

const DEFAULT_TERMS = {
  deliverables: 'grid plan with prices and sizes',
  quality_standards: 'levels inside bounds',
  evaluation_required: true,
  evaluator_type: 'uma_oov3',
};

const HEALTH_FACTOR_TERMS = {
  deliverables:
    'spoken Venus health conclusion plus structured JSON (markets CF/LT/APY and Comptroller getAccountLiquidity when an address is given)',
  quality_standards:
    'cite live Venus API or RPC; do not fabricate account HF; read-only — no repay or add-collateral',
  evaluation_required: true,
  evaluator_type: 'uma_oov3',
};

function termsFor(agent: AgentListing) {
  return agent.category === 'health_factor' ? HEALTH_FACTOR_TERMS : DEFAULT_TERMS;
}

/**
 * A2A `negotiate` against the seller. Data part only.
 * Quote TTL is 15 minutes (`quote_expires_at`); callers re-run this when expired.
 */
export async function renegotiateQuote(
  agent: AgentListing,
  task: string,
  fetchImpl: typeof fetch = fetch,
): Promise<NegotiationEnvelope> {
  const endpoint = agent.identity.endpoint;
  if (!endpoint) throw new Error('AGENT_ENDPOINT_REQUIRED');
  const data = await sendA2aData(
    endpoint,
    {
      skill: 'negotiate',
      task_description: task,
      terms: termsFor(agent),
    },
    fetchImpl,
    agent.identity.agentId,
  );
  return extractNegotiationEnvelope(data);
}
