import { NextResponse } from 'next/server';
import { activate } from '../../../lib/x402/activate';
import { getMockAgent } from '../../../lib/chain/mock';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
      nextStep: 'Use a live listing, a still-valid ERC-8183 negotiation envelope, and ERC8183_BUYER_PRIVATE_KEY on BSC testnet.',
    }, { status });
  }
}
