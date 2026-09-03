import { randomUUID } from 'node:crypto';
import type { AgentListing } from '../types';
import { extractNegotiationEnvelope, type NegotiationEnvelope } from './envelope';

const DEFAULT_TERMS = {
  deliverables: 'grid plan with prices and sizes',
  quality_standards: 'levels inside bounds',
  evaluation_required: true,
  evaluator_type: 'uma_oov3',
};

function a2aRpcUrl(endpoint: string): string {
  return endpoint.replace(/\/\.well-known\/agent-card\.json\/?$/i, '').replace(/\/+$/, '');
}

async function bearerToken(): Promise<string | undefined> {
  if (process.env.ERC8183_A2A_BEARER) return process.env.ERC8183_A2A_BEARER;
  const tokenUrl = process.env.ERC8183_OAUTH_TOKEN_URL;
  const clientId = process.env.ERC8183_OAUTH_CLIENT_ID;
  const clientSecret = process.env.ERC8183_OAUTH_CLIENT_SECRET;
  const scope = process.env.ERC8183_OAUTH_SCOPE;
  if (!tokenUrl || !clientId || !clientSecret) return undefined;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (scope) body.set('scope', scope);
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`A2A_OAUTH_FAILED: ${response.status} ${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as { access_token?: string };
  if (!json.access_token) throw new Error('A2A_OAUTH_FAILED: missing access_token');
  return json.access_token;
}

/**
 * Re-run A2A `negotiate` against the seller. Used when `quote_expires_at` has passed.
 */
export async function renegotiateQuote(
  agent: AgentListing,
  task: string,
  fetchImpl: typeof fetch = fetch,
): Promise<NegotiationEnvelope> {
  const endpoint = agent.identity.endpoint;
  if (!endpoint) throw new Error('AGENT_ENDPOINT_REQUIRED');
  const token = await bearerToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const payload = {
    jsonrpc: '2.0',
    id: 'renegotiate-1',
    method: 'message/send',
    params: {
      message: {
        role: 'user',
        messageId: randomUUID(),
        parts: [
          {
            kind: 'data',
            data: {
              skill: 'negotiate',
              task_description: task,
              terms: DEFAULT_TERMS,
            },
          },
        ],
      },
    },
  };
  const response = await fetchImpl(a2aRpcUrl(endpoint), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (response.status === 401 || response.status === 403) {
    throw new Error('A2A_AUTH_REQUIRED');
  }
  if (!response.ok) {
    throw new Error(`NEGOTIATE_FAILED: ${response.status} ${text.slice(0, 300)}`);
  }
  return extractNegotiationEnvelope(text);
}
