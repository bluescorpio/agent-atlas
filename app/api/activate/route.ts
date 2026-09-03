import { NextResponse } from 'next/server';
import { activate } from '../../../lib/x402/activate';
import { getMockAgent } from '../../../lib/chain/mock';

export const runtime = 'nodejs';
/** Negotiate + 4 chain writes + seller LLM submit can exceed 60s. */
export const maxDuration = 300;

function asParams(body: {
  params?: Record<string, unknown>;
  envelope?: unknown;
  quote?: unknown;
  negotiation_hash?: unknown;
}): Record<string, string> {
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
    return 'This listing is Demo — not deployed. Hire the live grid-bnb-usdt agent via ERC-8183 on /a/grid-bnb-usdt.';
  }
  if (error === 'WALLET_NOT_CONNECTED') {
    return 'Connect a wallet, then retry. The address must match ERC8183_BUYER_PRIVATE_KEY on the server.';
  }
  if (error === 'WALLET_MISMATCH') {
    return 'Connected wallet must equal the ERC8183_BUYER_PRIVATE_KEY address (BSC testnet buyer with ≥ 0.1 U + gas).';
  }
  if (error === 'ERC8183_BUYER_PRIVATE_KEY_REQUIRED' || error.startsWith('A2A_OAUTH')) {
    return 'Set AGENT_CLIENT_ID / AGENT_CLIENT_SECRET and ERC8183_BUYER_PRIVATE_KEY on the server (.env.local), then retry.';
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
    const agent = body.agentId ? getMockAgent(body.agentId) : undefined;
    if (!agent) return NextResponse.json({ error: 'AGENT_NOT_FOUND' }, { status: 404 });
    const result = await activate(agent, asParams(body), body.wallet ?? '');
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ACTIVATION_FAILED';
    const status = message === 'DEMO_AGENT_NOT_ACTIVATABLE' ? 409 : 400;
    return NextResponse.json({
      error: message,
      nextStep: nextStepFor(message),
    }, { status });
  }
}
