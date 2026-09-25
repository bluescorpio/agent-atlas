/**
 * AWS AgentCore A2A buyer auth (Cognito client_credentials).
 *
 * Live sellers validate JWT `iss` =
 * https://cognito-idp.us-east-1.amazonaws.com/us-east-1_yx8QfJRRu
 *
 * Do not send bnbagent-api tokens (`AGENT_CLIENT_ID` / `invoke:<runtimeId>`)
 * at AgentCore invoke URLs — that is the `Claim 'iss' value mismatch` 401.
 */

import type { Category } from '../types';

export const COGNITO_TOKEN_URL =
  'https://bnbagent-850122838544.auth.us-east-1.amazoncognito.com/oauth2/token';
export const COGNITO_SCOPE = 'bnbagent-seller/invoke';
export const COGNITO_ISSUER =
  'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_yx8QfJRRu';

export type LiveAgentId =
  | 'grid-bnb-usdt'
  | 'grid-eth-usdt'
  | 'rebalancing-pcs-v3'
  | 'rebalancing-pcs-v3-eth'
  | 'hf-guard-venus'
  | 'hf-guard-lista'
  | 'yield-stable-router'
  | 'yield-venus-usdt';

export type AgentCoreClientConfig = {
  agentId: LiveAgentId;
  clientId: string;
  secretEnv: string;
  runtimeMarker: string;
  category: Exclude<Category, 'unclassified'>;
};

export const AGENTCORE_A2A_CLIENTS: Record<LiveAgentId, AgentCoreClientConfig> = {
  'grid-bnb-usdt': {
    agentId: 'grid-bnb-usdt',
    clientId: '3pn5ccnsb9h7utc8oic25l9iq',
    secretEnv: 'GRID_A2A_CLIENT_SECRET',
    runtimeMarker: 'gridbnbusdt',
    category: 'grid_trading',
  },
  'grid-eth-usdt': {
    agentId: 'grid-eth-usdt',
    clientId: '7vcb6sbgqhj1agkrn7ti3s62ol',
    secretEnv: 'GRID_ETH_A2A_CLIENT_SECRET',
    runtimeMarker: 'gridethusdt',
    category: 'grid_trading',
  },
  'rebalancing-pcs-v3': {
    agentId: 'rebalancing-pcs-v3',
    clientId: '67vlfr0f7piov7em6p47hr1u7f',
    secretEnv: 'REBALANCING_A2A_CLIENT_SECRET',
    runtimeMarker: 'rebalancingpcsv3',
    category: 'rebalancing',
  },
  'rebalancing-pcs-v3-eth': {
    agentId: 'rebalancing-pcs-v3-eth',
    clientId: '6f64mjn82smitdv5l71qdjc3j',
    secretEnv: 'REBALANCING_ETH_A2A_CLIENT_SECRET',
    runtimeMarker: 'rebalancingpcsv3eth',
    category: 'rebalancing',
  },
  'hf-guard-venus': {
    agentId: 'hf-guard-venus',
    clientId: 'chtopvung16glktss3assicu5',
    secretEnv: 'HF_A2A_CLIENT_SECRET',
    runtimeMarker: 'hfguardvenus',
    category: 'health_factor',
  },
  'hf-guard-lista': {
    agentId: 'hf-guard-lista',
    clientId: '1jq6remm6vn6t92b39rj5a620e',
    secretEnv: 'HF_LISTA_A2A_CLIENT_SECRET',
    runtimeMarker: 'hfguardlista',
    category: 'health_factor',
  },
  'yield-stable-router': {
    agentId: 'yield-stable-router',
    clientId: '5ahoiupde17urbcab90a8ekkvs',
    secretEnv: 'YIELD_A2A_CLIENT_SECRET',
    runtimeMarker: 'yieldstablerouter',
    category: 'yield',
  },
  'yield-venus-usdt': {
    agentId: 'yield-venus-usdt',
    clientId: '1m3ebbd2ftdt6pappi1ot9q2bi',
    secretEnv: 'YIELD_VENUS_A2A_CLIENT_SECRET',
    runtimeMarker: 'yieldvenususdt',
    category: 'yield',
  },
};

/** Longer runtime markers first so `rebalancingpcsv3eth` does not match `rebalancingpcsv3`. */
function clientsByMarkerLength(): AgentCoreClientConfig[] {
  return Object.values(AGENTCORE_A2A_CLIENTS).sort(
    (a, b) => b.runtimeMarker.length - a.runtimeMarker.length,
  );
}

export function isAgentCoreEndpoint(endpoint: string): boolean {
  return /bedrock-agentcore\./i.test(endpoint) || /amazonaws\.com\/runtimes\//i.test(endpoint);
}

export function agentIdFromAgentCoreEndpoint(endpoint: string): LiveAgentId | null {
  const decoded = decodeURIComponent(endpoint);
  for (const config of clientsByMarkerLength()) {
    if (decoded.includes(config.runtimeMarker) || endpoint.includes(config.runtimeMarker)) {
      return config.agentId;
    }
  }
  return null;
}

export function resolveLiveAgentId(agentId: string | undefined, endpoint: string): LiveAgentId {
  if (agentId && agentId in AGENTCORE_A2A_CLIENTS) return agentId as LiveAgentId;
  const fromEndpoint = agentIdFromAgentCoreEndpoint(endpoint);
  if (fromEndpoint) return fromEndpoint;
  throw new Error(
    `A2A_OAUTH_CONFIG: unknown AgentCore seller (agentId=${agentId ?? 'missing'}). Expected a mapped AgentCore runtime in AGENTCORE_A2A_CLIENTS.`,
  );
}

export type AgentCoreAuth = {
  agentId: LiveAgentId;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope: string;
  sessionId: string;
};

export function resolveAgentCoreAuth(agentId: string | undefined, endpoint: string): AgentCoreAuth {
  const resolvedId = resolveLiveAgentId(agentId, endpoint);
  const config = AGENTCORE_A2A_CLIENTS[resolvedId];
  const clientSecret = process.env[config.secretEnv]?.trim();
  if (!clientSecret) {
    throw new Error(
      `A2A_OAUTH_CONFIG: missing ${config.secretEnv} for ${resolvedId}. Set it on the server (Vercel env / .env.local). Do not reuse AGENT_CLIENT_SECRET (bnbagent-api).`,
    );
  }
  return {
    agentId: resolvedId,
    clientId: config.clientId,
    clientSecret,
    tokenUrl: COGNITO_TOKEN_URL,
    scope: COGNITO_SCOPE,
    sessionId: `agent-atlas-${resolvedId}-a2a-session-01`,
  };
}

export function activateErrorHttpStatus(message: string): number {
  if (message === 'DEMO_AGENT_NOT_ACTIVATABLE') return 409;
  if (message.startsWith('A2A_OAUTH_CONFIG')) return 500;
  return 400;
}
