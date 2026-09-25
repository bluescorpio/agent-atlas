import { NextResponse } from 'next/server';
import { activate } from '../../../lib/x402/activate';
import { getAgentListing } from '../../../lib/chain/erc8004';
import { activateErrorHttpStatus } from '../../../lib/erc8183/agentcore-oauth';

export const runtime = 'nodejs';
/** Negotiate + 4 chain writes + seller LLM submit can exceed 60s. */
export const maxDuration = 300;

function asParams(body: {
  params?: Record<string, unknown>;
  envelope?: unknown;
  quote?: unknown;
  negotiation_hash?: unknown;
}): Record<string, string> {
  // Task inputs come from `params` only (task / gridCount / lowerPrice /
  // upperPrice / budgetCap). Top-level taskDescription / terms are ignored.
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.params ?? {})) {
    if (value === undefined || value === null) continue;
    params[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  const envelope = body.envelope ?? body.quote;
  if (envelope !== undefined && params.envelope === undefined) {
    params.envelope = typeof envelope === 'string' ? envelope : JSON.stringify(envelope);
  }
  if (typeof body.negotiation_hash === 'string' && !params.negotiation_hash) {
    params.negotiation_hash = body.negotiation_hash;
  }
  return params;
}

function nextStepFor(error: string): string {
  if (error === 'DEMO_AGENT_NOT_ACTIVATABLE') {
    return 'This agent is not hireable from Atlas (no AgentCore A2A client mapped from its registration URI).';
  }
  if (error === 'WALLET_NOT_CONNECTED') {
    return 'Connect a wallet, then retry. The address must match ERC8183_BUYER_PRIVATE_KEY on the server.';
  }
  if (error === 'WALLET_MISMATCH') {
    return 'Connected wallet must equal the ERC8183_BUYER_PRIVATE_KEY address (BSC testnet buyer with ≥ 0.1 U + gas).';
  }
  if (error.startsWith('A2A_OAUTH_CONFIG')) {
    return 'Set the per-agent Cognito secret on the server: GRID_A2A_CLIENT_SECRET, REBALANCING_A2A_CLIENT_SECRET, HF_A2A_CLIENT_SECRET, or YIELD_A2A_CLIENT_SECRET. Do not reuse AGENT_CLIENT_SECRET (that is bnbagent-api, not AgentCore).';
  }
  if (error === 'SPEND_CAP_REQUIRED' || error === 'SPEND_CAP_INVALID') {
    return 'Set budgetCap to a positive $U amount. Hire refuses to fund without a real spend cap.';
  }
  if (error.startsWith('SPEND_CAP_EXCEEDED')) {
    return 'Quoted price is above budgetCap. Raise the cap or pick a cheaper quote — Atlas will not approve or fund above the cap.';
  }
  if (error === 'ERC8183_BUYER_PRIVATE_KEY_REQUIRED' || error.startsWith('A2A_OAUTH')) {
    return 'Set ERC8183_BUYER_PRIVATE_KEY and the per-agent Cognito client secrets on the server (.env.local / Vercel), then retry.';
  }
  return 'Retry the live ERC-8183 path: negotiate → createJob → registerJob → setBudget → fund → notify_funded → poll SUBMITTED. x402/B402 is not enabled.';
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      agentId?: string;
      params?: Record<string, unknown>;
      wallet?: string;
      envelope?: unknown;
      quote?: unknown;
      negotiation_hash?: unknown;
    };
    const agent = body.agentId ? await getAgentListing(body.agentId) : undefined;
    if (!agent) return NextResponse.json({ error: 'AGENT_NOT_FOUND' }, { status: 404 });
    const result = await activate(agent, asParams(body), body.wallet ?? '');
    return NextResponse.json({
      jobId: result.jobId,
      status: result.status,
      deliverableUrl: result.deliverableUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ACTIVATION_FAILED';
    const status = activateErrorHttpStatus(message);
    return NextResponse.json({
      error: message,
      nextStep: nextStepFor(message),
    }, { status });
  }
}
