import type { AgentListing } from '../types';

export type ActivationResult = { taskId: string; txHash: `0x${string}`; receipt: Record<string, unknown> };

/**
 * Server-side seam for the real ERC-8183/x402 flow. The facilitator URL,
 * settlement token, and payment header format are intentionally required from
 * confirmed Studio/Binance documentation before this function can sign.
 */
export async function activate(agent: AgentListing, params: Record<string, string>, wallet: string): Promise<ActivationResult> {
  if (agent.source !== 'live') throw new Error('DEMO_AGENT_NOT_ACTIVATABLE');
  if (!wallet) throw new Error('WALLET_NOT_CONNECTED');
  if (!agent.identity.endpoint) throw new Error('AGENT_ENDPOINT_REQUIRED');
  const facilitator = process.env.X402_FACILITATOR_URL;
  if (!facilitator) throw new Error('X402_FACILITATOR_URL_REQUIRED');
  void params;
  throw new Error('X402_PROTOCOL_CONFIRMATION_REQUIRED');
}
