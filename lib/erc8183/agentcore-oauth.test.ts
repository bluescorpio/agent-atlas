import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AGENTCORE_A2A_CLIENTS,
  COGNITO_ISSUER,
  COGNITO_SCOPE,
  COGNITO_TOKEN_URL,
  activateErrorHttpStatus,
  agentIdFromAgentCoreEndpoint,
  isAgentCoreEndpoint,
  resolveAgentCoreAuth,
} from './agentcore-oauth';

const GRID_INVOKE =
  'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fgridbnbusdt-bohsdVE5Pv/invocations?qualifier=DEFAULT';
const HF_INVOKE =
  'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fhfguardvenus-sG614z4iLZ/invocations?qualifier=DEFAULT';
const GRID_ETH_INVOKE =
  'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fgridethusdt-oqxEWYAiua/invocations?qualifier=DEFAULT';
const REBALANCING_ETH_INVOKE =
  'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Frebalancingpcsv3eth-Rgu6VM9KJh/invocations?qualifier=DEFAULT';

const SECRET_KEYS = [
  'GRID_A2A_CLIENT_SECRET',
  'GRID_ETH_A2A_CLIENT_SECRET',
  'REBALANCING_A2A_CLIENT_SECRET',
  'REBALANCING_ETH_A2A_CLIENT_SECRET',
  'HF_A2A_CLIENT_SECRET',
  'HF_LISTA_A2A_CLIENT_SECRET',
  'YIELD_A2A_CLIENT_SECRET',
  'YIELD_VENUS_A2A_CLIENT_SECRET',
] as const;

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const key of [...SECRET_KEYS, 'AGENT_CLIENT_SECRET', 'ERC8183_A2A_BEARER']) {
    prev[key] = process.env[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('AgentCore client ids match the live Cognito apps', () => {
  assert.equal(AGENTCORE_A2A_CLIENTS['grid-bnb-usdt'].clientId, '3pn5ccnsb9h7utc8oic25l9iq');
  assert.equal(AGENTCORE_A2A_CLIENTS['grid-eth-usdt'].clientId, '7vcb6sbgqhj1agkrn7ti3s62ol');
  assert.equal(AGENTCORE_A2A_CLIENTS['rebalancing-pcs-v3'].clientId, '67vlfr0f7piov7em6p47hr1u7f');
  assert.equal(AGENTCORE_A2A_CLIENTS['rebalancing-pcs-v3-eth'].clientId, '6f64mjn82smitdv5l71qdjc3j');
  assert.equal(AGENTCORE_A2A_CLIENTS['hf-guard-venus'].clientId, 'chtopvung16glktss3assicu5');
  assert.equal(AGENTCORE_A2A_CLIENTS['hf-guard-lista'].clientId, '1jq6remm6vn6t92b39rj5a620e');
  assert.equal(AGENTCORE_A2A_CLIENTS['yield-stable-router'].clientId, '5ahoiupde17urbcab90a8ekkvs');
  assert.equal(AGENTCORE_A2A_CLIENTS['yield-venus-usdt'].clientId, '1m3ebbd2ftdt6pappi1ot9q2bi');
  assert.equal(COGNITO_TOKEN_URL, 'https://bnbagent-850122838544.auth.us-east-1.amazoncognito.com/oauth2/token');
  assert.equal(COGNITO_SCOPE, 'bnbagent-seller/invoke');
  assert.equal(COGNITO_ISSUER, 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_yx8QfJRRu');
});

test('resolves marketplace id from AgentCore invoke ARN', () => {
  assert.equal(isAgentCoreEndpoint(GRID_INVOKE), true);
  assert.equal(agentIdFromAgentCoreEndpoint(GRID_INVOKE), 'grid-bnb-usdt');
  assert.equal(agentIdFromAgentCoreEndpoint(HF_INVOKE), 'hf-guard-venus');
  assert.equal(agentIdFromAgentCoreEndpoint(GRID_ETH_INVOKE), 'grid-eth-usdt');
  assert.equal(agentIdFromAgentCoreEndpoint(REBALANCING_ETH_INVOKE), 'rebalancing-pcs-v3-eth');
});

test('missing per-agent secret is A2A_OAUTH_CONFIG, even if AGENT_CLIENT_SECRET is set', () => {
  withEnv({
    GRID_A2A_CLIENT_SECRET: undefined,
    AGENT_CLIENT_SECRET: 'bnbs_should_not_be_used',
    ERC8183_A2A_BEARER: 'fake.jwt.token',
  }, () => {
    assert.throws(
      () => resolveAgentCoreAuth('grid-bnb-usdt', GRID_INVOKE),
      (error: Error) => {
        assert.match(error.message, /^A2A_OAUTH_CONFIG: missing GRID_A2A_CLIENT_SECRET/);
        return true;
      },
    );
  });
});

test('resolveAgentCoreAuth reads GRID_A2A_CLIENT_SECRET and never returns a hardcoded secret', () => {
  withEnv({ GRID_A2A_CLIENT_SECRET: 'grid-secret-from-env' }, () => {
    const auth = resolveAgentCoreAuth('grid-bnb-usdt', GRID_INVOKE);
    assert.equal(auth.clientId, '3pn5ccnsb9h7utc8oic25l9iq');
    assert.equal(auth.clientSecret, 'grid-secret-from-env');
    assert.equal(auth.tokenUrl, COGNITO_TOKEN_URL);
    assert.equal(auth.scope, COGNITO_SCOPE);
    assert.ok(auth.sessionId.length >= 33);
  });
});

test('activate maps OAuth config errors to HTTP 500', () => {
  assert.equal(activateErrorHttpStatus('A2A_OAUTH_CONFIG: missing GRID_A2A_CLIENT_SECRET for grid-bnb-usdt'), 500);
  assert.equal(activateErrorHttpStatus('A2A_AUTH_REQUIRED: 401 iss'), 400);
  assert.equal(activateErrorHttpStatus('DEMO_AGENT_NOT_ACTIVATABLE'), 409);
});
