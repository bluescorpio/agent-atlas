import { NextResponse } from 'next/server';
import { activate } from '../../../lib/x402/activate';
import { getMockAgent } from '../../../lib/chain/mock';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { agentId?: string; params?: Record<string, string>; wallet?: string };
    const agent = body.agentId ? getMockAgent(body.agentId) : undefined;
    if (!agent) return NextResponse.json({ error: 'AGENT_NOT_FOUND' }, { status: 404 });
    const result = await activate(agent, body.params ?? {}, body.wallet ?? '');
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ACTIVATION_FAILED';
    const status = message === 'DEMO_AGENT_NOT_ACTIVATABLE' ? 409 : 400;
    return NextResponse.json({ error: message, nextStep: 'Use a live Agent Studio listing and confirmed payment configuration.' }, { status });
  }
}
