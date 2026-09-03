import { randomUUID } from 'node:crypto';
import {
  BNBAGENT_OAUTH_TOKEN_URL,
  GRID_A2A_INVOKE_URL,
  GRID_RUNTIME_ID,
} from './constants';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** Agent-card URL → A2A JSON-RPC invoke URL (`.../v1/rt/<id>/a2a`). */
export function a2aInvokeUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  if (!trimmed) return GRID_A2A_INVOKE_URL;
  if (/\/a2a$/i.test(trimmed)) return trimmed;
  const runtimeBase = trimmed.match(/^(https?:\/\/[^/]+\/v1\/rt\/[^/]+)/i);
  if (runtimeBase) return `${runtimeBase[1]}/a2a`;
  return trimmed.replace(/\/\.well-known\/agent-card\.json$/i, '');
}

export function oauthScopeForEndpoint(endpoint: string): string {
  const fromEnv = process.env.AGENT_OAUTH_SCOPE || process.env.ERC8183_OAUTH_SCOPE;
  if (fromEnv) return fromEnv;
  const runtimeId = endpoint.match(/\/v1\/rt\/([^/]+)/i)?.[1] ?? GRID_RUNTIME_ID;
  return `invoke:${runtimeId}`;
}

async function bearerToken(endpoint: string, fetchImpl: typeof fetch): Promise<string> {
  if (process.env.ERC8183_A2A_BEARER) return process.env.ERC8183_A2A_BEARER;
  const tokenUrl =
    process.env.AGENT_OAUTH_TOKEN_URL ||
    process.env.ERC8183_OAUTH_TOKEN_URL ||
    BNBAGENT_OAUTH_TOKEN_URL;
  const clientId = process.env.AGENT_CLIENT_ID || process.env.ERC8183_OAUTH_CLIENT_ID;
  const clientSecret = process.env.AGENT_CLIENT_SECRET || process.env.ERC8183_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('A2A_OAUTH_REQUIRED: set AGENT_CLIENT_ID and AGENT_CLIENT_SECRET');
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: oauthScopeForEndpoint(endpoint),
  });
  const response = await fetchImpl(tokenUrl, {
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

export function extractA2aDataPart(input: unknown): Record<string, unknown> {
  let value = input;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value.trim().replace(/%\s*$/, ''));
    } catch (error) {
      throw new Error(`A2A_RESPONSE_INVALID: ${error instanceof Error ? error.message : 'json'}`);
    }
  }
  const root = asRecord(value);
  if (!root) throw new Error('A2A_RESPONSE_INVALID');
  const rpcError = asRecord(root.error);
  if (rpcError) {
    throw new Error(`A2A_RPC_ERROR: ${String(rpcError.message ?? JSON.stringify(rpcError)).slice(0, 300)}`);
  }
  const result = asRecord(root.result) ?? root;
  const nestedMessage = asRecord(result.message);
  const parts = Array.isArray(result.parts)
    ? result.parts
    : Array.isArray(nestedMessage?.parts)
      ? nestedMessage.parts
      : Array.isArray(root.parts)
        ? root.parts
        : null;
  if (parts) {
    for (const part of parts) {
      const rec = asRecord(part);
      const data = rec ? asRecord(rec.data) : null;
      if (rec?.kind === 'data' && data) return data;
    }
  }
  if (typeof root.skill === 'string' || typeof result.skill === 'string') {
    return (typeof root.skill === 'string' ? root : result);
  }
  throw new Error('A2A_DATA_PART_REQUIRED');
}

/**
 * A2A `message/send` with a single data part. Never sends a text part.
 */
export async function sendA2aData(
  endpoint: string,
  data: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const url = a2aInvokeUrl(endpoint);
  const token = await bearerToken(endpoint, fetchImpl);
  const payload = {
    jsonrpc: '2.0',
    id: randomUUID(),
    method: 'message/send',
    params: {
      message: {
        role: 'user',
        messageId: randomUUID(),
        parts: [{ kind: 'data', data }],
      },
    },
  };
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (response.status === 401 || response.status === 403) {
    throw new Error(`A2A_AUTH_REQUIRED: ${response.status} ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error(`A2A_SEND_FAILED: ${response.status} ${text.slice(0, 300)}`);
  }
  return extractA2aDataPart(text);
}
