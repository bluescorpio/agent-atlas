import type { AgentListing } from '../types';
import { activateWithErc8183, type Erc8183ActivationResult } from '../erc8183/activate';

export type ActivationResult = Erc8183ActivationResult;

/**
 * x402 / B402 path. Kept as a stable seam; B402 merchant credentials are not
 * available yet so this always fails closed.
 */
export async function activateWithX402(
  agent: AgentListing,
  params: Record<string, string>,
  wallet: string,
): Promise<ActivationResult> {
  void agent;
  void params;
  void wallet;
  throw new Error('X402_B402_CREDENTIALS_NOT_READY');
}

/**
 * Live hire path: ERC-8183 negotiate → fund → notify_funded → poll SUBMITTED.
 * x402 stays callable via {@link activateWithX402} once B402 credentials land.
 */
export async function activate(
  agent: AgentListing,
  params: Record<string, string>,
  wallet: string,
): Promise<ActivationResult> {
  if (!agent.hireable) throw new Error('DEMO_AGENT_NOT_ACTIVATABLE');
  if (!wallet) throw new Error('WALLET_NOT_CONNECTED');
  if (!agent.identity.endpoint) throw new Error('AGENT_ENDPOINT_REQUIRED');
  return activateWithErc8183(agent, params, wallet);
}

export { activateWithErc8183 } from '../erc8183/activate';
