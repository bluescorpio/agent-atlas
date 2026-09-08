import { randomUUID } from 'node:crypto';
import {
  isAgentCoreEndpoint,
  resolveAgentCoreAuth,
  COGNITO_SCOPE,
} from './agentcore-oauth';
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
  const trimmed = endpoint.trim();
  if (isAgentCoreEndpoint(trimmed)) return trimmed;
  const noSlash = trimmed.replace(/\/+$/, '');
  if (!noSlash) return GRID_A2A_INVOKE_URL;
  if (/\/a2a$/i.test(noSlash)) return noSlash;
  const runtimeBase = noSlash.match(/^(https?:\/\/[^/]+\/v1\/rt\/[^/]+)/i);
  if (runtimeBase) return `${runtimeBase[1]}/a2a`;
  return noSlash.replace(/\/\.well-known\/agent-card\.json$/i, '');
}

export function runtimeIdFromEndpoint(endpoint: string): string | null {
  return endpoint.match(/\/v1\/rt\/([^/]+)/i)?.[1] ?? null;
}

export function oauthScopeForEndpoint(endpoint: string): string {
  if (isAgentCoreEndpoint(endpoint)) {
    return COGNITO_SCOPE;
  }
  const runtimeId = runtimeIdFromEndpoint(endpoint);
  if (runtimeId) {
    const perRuntime = process.env[`AGENT_OAUTH_SCOPE_${runtimeId}`];
    if (perRuntime) return perRuntime;
  }
  const fromEnv = process.env.AGENT_OAUTH_SCOPE || process.env.ERC8183_OAUTH_SCOPE;
  if (fromEnv && runtimeId && fromEnv === `invoke:${runtimeId}`) return fromEnv;
  if (runtimeId) return `invoke:${runtimeId}`;
  if (fromEnv) return fromEnv;
  return `invoke:${GRID_RUNTIME_ID}`;
}

function oauthClient(endpoint: string): { id: string; secret: string } {
  const runtimeId = runtimeIdFromEndpoint(endpoint);
  const id =
    (runtimeId && process.env[`AGENT_CLIENT_ID_${runtimeId}`]) ||
    process.env.AGENT_CLIENT_ID ||
    process.env.ERC8183_OAUTH_CLIENT_ID;
  const secret =
    (runtimeId && process.env[`AGENT_CLIENT_SECRET_${runtimeId}`]) ||
    process.env.AGENT_CLIENT_SECRET ||
    process.env.ERC8183_OAUTH_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('A2A_OAUTH_REQUIRED: set AGENT_CLIENT_ID and AGENT_CLIENT_SECRET');
  }
  return { id, secret };
}

async function fetchClientCredentialsToken(
  tokenUrl: string,
  clientId: string,
  clientSecret: string,
  scope: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
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

async function bearerToken(
  endpoint: string,
  fetchImpl: typeof fetch,
  agentId?: string,
): Promise<{ token: string; sessionId?: string }> {
  if (isAgentCoreEndpoint(endpoint)) {
    const auth = resolveAgentCoreAuth(agentId, endpoint);
    const token = await fetchClientCredentialsToken(
      auth.tokenUrl,
      auth.clientId,
      auth.clientSecret,
      auth.scope,
      fetchImpl,
    );
    return { token, sessionId: auth.sessionId };
  }
  if (process.env.ERC8183_A2A_BEARER) return { token: process.env.ERC8183_A2A_BEARER };
  const tokenUrl =
    process.env.AGENT_OAUTH_TOKEN_URL ||
    process.env.ERC8183_OAUTH_TOKEN_URL ||
    BNBAGENT_OAUTH_TOKEN_URL;
  const { id: clientId, secret: clientSecret } = oauthClient(endpoint);
  const token = await fetchClientCredentialsToken(
    tokenUrl,
    clientId,
    clientSecret,
    oauthScopeForEndpoint(endpoint),
    fetchImpl,
  );
  return { token };
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
  agentId?: string,
): Promise<Record<string, unknown>> {
  const url = a2aInvokeUrl(endpoint);
  const { token, sessionId } = await bearerToken(endpoint, fetchImpl, agentId);
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
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };
  if (sessionId) {
    headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'] = sessionId;
  }
  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
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
