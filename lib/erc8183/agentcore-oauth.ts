/**
 * AWS AgentCore A2A buyer auth (Cognito client_credentials).
 *
 * Live sellers validate JWT `iss` =
 * https://cognito-idp.us-east-1.amazonaws.com/us-east-1_yx8QfJRRu
 *
 * Do not send bnbagent-api tokens (`AGENT_CLIENT_ID` / `invoke:<runtimeId>`)
 * at AgentCore invoke URLs — that is the `Claim 'iss' value mismatch` 401.
 */

export const COGNITO_TOKEN_URL =
  'https://bnbagent-850122838544.auth.us-east-1.amazoncognito.com/oauth2/token';
export const COGNITO_SCOPE = 'bnbagent-seller/invoke';
export const COGNITO_ISSUER =
  'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_yx8QfJRRu';

export type LiveAgentId =
  | 'grid-bnb-usdt'
  | 'rebalancing-pcs-v3'
  | 'hf-guard-venus'
  | 'yield-stable-router';

export type AgentCoreClientConfig = {
  agentId: LiveAgentId;
  clientId: string;
  secretEnv: 'GRID_A2A_CLIENT_SECRET' | 'REBALANCING_A2A_CLIENT_SECRET' | 'HF_A2A_CLIENT_SECRET' | 'YIELD_A2A_CLIENT_SECRET';
  runtimeMarker: string;
};

export const AGENTCORE_A2A_CLIENTS: Record<LiveAgentId, AgentCoreClientConfig> = {
  'grid-bnb-usdt': {
    agentId: 'grid-bnb-usdt',
    clientId: '3pn5ccnsb9h7utc8oic25l9iq',
    secretEnv: 'GRID_A2A_CLIENT_SECRET',
    runtimeMarker: 'gridbnbusdt',
  },
  'rebalancing-pcs-v3': {
    agentId: 'rebalancing-pcs-v3',
    clientId: '67vlfr0f7piov7em6p47hr1u7f',
    secretEnv: 'REBALANCING_A2A_CLIENT_SECRET',
    runtimeMarker: 'rebalancingpcsv3',
  },
  'hf-guard-venus': {
    agentId: 'hf-guard-venus',
    clientId: 'chtopvung16glktss3assicu5',
    secretEnv: 'HF_A2A_CLIENT_SECRET',
    runtimeMarker: 'hfguardvenus',
  },
  'yield-stable-router': {
    agentId: 'yield-stable-router',
    clientId: '5ahoiupde17urbcab90a8ekkvs',
    secretEnv: 'YIELD_A2A_CLIENT_SECRET',
    runtimeMarker: 'yieldstablerouter',
  },
};

export function isAgentCoreEndpoint(endpoint: string): boolean {
  return /bedrock-agentcore\./i.test(endpoint) || /amazonaws\.com\/runtimes\//i.test(endpoint);
}

export function agentIdFromAgentCoreEndpoint(endpoint: string): LiveAgentId | null {
  const decoded = decodeURIComponent(endpoint);
  for (const config of Object.values(AGENTCORE_A2A_CLIENTS)) {
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
    `A2A_OAUTH_CONFIG: unknown AgentCore seller (agentId=${agentId ?? 'missing'}). Expected grid-bnb-usdt, rebalancing-pcs-v3, hf-guard-venus, or yield-stable-router.`,
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
