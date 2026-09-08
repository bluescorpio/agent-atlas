import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendA2aData, oauthScopeForEndpoint, a2aInvokeUrl } from './a2a';
import { COGNITO_SCOPE, COGNITO_TOKEN_URL } from './agentcore-oauth';

test('sendA2aData uses form-body client_credentials and a data-part message/send', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    if (url.includes('/oauth/token')) {
      const body = String(init?.body);
      assert.match(body, /grant_type=client_credentials/);
      assert.match(body, /client_id=cid/);
      assert.match(body, /client_secret=csecret/);
      assert.match(body, /scope=invoke%3A01M1K4SSXB6VA50K5C6FV6E4JK/);
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers?.authorization, undefined);
      return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 });
    }
    const payload = JSON.parse(String(init?.body)) as {
      method: string;
      params: { message: { parts: Array<{ kind: string; data: Record<string, unknown> }> } };
    };
    assert.equal(payload.method, 'message/send');
    assert.equal(payload.params.message.parts[0].kind, 'data');
    assert.equal(payload.params.message.parts[0].data.skill, 'negotiate');
    assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer tok');
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        kind: 'message',
        parts: [{
          kind: 'data',
          data: { negotiation_hash: '0xabc', chain_id: 97, verifying_contract: '0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de' },
        }],
      },
    }), { status: 200 });
  };

  const prev = {
    AGENT_CLIENT_ID: process.env.AGENT_CLIENT_ID,
    AGENT_CLIENT_SECRET: process.env.AGENT_CLIENT_SECRET,
    AGENT_OAUTH_TOKEN_URL: process.env.AGENT_OAUTH_TOKEN_URL,
    AGENT_OAUTH_SCOPE: process.env.AGENT_OAUTH_SCOPE,
    ERC8183_A2A_BEARER: process.env.ERC8183_A2A_BEARER,
  };
  process.env.AGENT_CLIENT_ID = 'cid';
  process.env.AGENT_CLIENT_SECRET = 'csecret';
  process.env.AGENT_OAUTH_TOKEN_URL = 'https://bnbagent-api.bnbchain.world/v1/oauth/token';
  delete process.env.AGENT_OAUTH_SCOPE;
  delete process.env.ERC8183_A2A_BEARER;
  try {
    const data = await sendA2aData(
      'https://bnbagent-api.bnbchain.world/v1/rt/01M1K4SSXB6VA50K5C6FV6E4JK/.well-known/agent-card.json',
      { skill: 'negotiate', task_description: 'grid' },
      fetchImpl as typeof fetch,
    );
    assert.equal(data.negotiation_hash, '0xabc');
    assert.equal(calls[0].url, 'https://bnbagent-api.bnbchain.world/v1/oauth/token');
    assert.equal(calls[1].url, 'https://bnbagent-api.bnbchain.world/v1/rt/01M1K4SSXB6VA50K5C6FV6E4JK/a2a');
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('oauthScopeForEndpoint ignores a global scope that belongs to another runtime', () => {
  const prev = process.env.AGENT_OAUTH_SCOPE;
  process.env.AGENT_OAUTH_SCOPE = 'invoke:01M1K4SSXB6VA50K5C6FV6E4JK';
  try {
    assert.equal(
      oauthScopeForEndpoint('https://bnbagent-api.bnbchain.world/v1/rt/01OTHERRUNTIMEID/.well-known/agent-card.json'),
      'invoke:01OTHERRUNTIMEID',
    );
    assert.equal(
      oauthScopeForEndpoint('https://bnbagent-api.bnbchain.world/v1/rt/01M1K4SSXB6VA50K5C6FV6E4JK/.well-known/agent-card.json'),
      'invoke:01M1K4SSXB6VA50K5C6FV6E4JK',
    );
  } finally {
    if (prev === undefined) delete process.env.AGENT_OAUTH_SCOPE;
    else process.env.AGENT_OAUTH_SCOPE = prev;
  }
});

const GRID_AGENTCORE =
  'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fgridbnbusdt-bohsdVE5Pv/invocations?qualifier=DEFAULT';

test('a2aInvokeUrl leaves AgentCore invoke URLs untouched (query string stays)', () => {
  assert.equal(a2aInvokeUrl(GRID_AGENTCORE), GRID_AGENTCORE);
});

test('oauthScopeForEndpoint uses Cognito invoke scope on AgentCore URLs', () => {
  assert.equal(oauthScopeForEndpoint(GRID_AGENTCORE), COGNITO_SCOPE);
});

test('AgentCore sendA2aData uses Cognito client_credentials and ignores bnbagent-api secrets', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    if (url === COGNITO_TOKEN_URL) {
      const body = String(init?.body);
      assert.match(body, /grant_type=client_credentials/);
      assert.match(body, /client_id=3pn5ccnsb9h7utc8oic25l9iq/);
      assert.match(body, /client_secret=grid-secret-from-env/);
      assert.match(body, /scope=bnbagent-seller%2Finvoke/);
      return new Response(JSON.stringify({ access_token: 'cognito-tok' }), { status: 200 });
    }
    if (url.includes('bnbagent-api.bnbchain.world')) {
      throw new Error(`must not call bnbagent-api: ${url}`);
    }
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers.authorization, 'Bearer cognito-tok');
    assert.equal(headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'], 'agent-atlas-grid-bnb-usdt-a2a-session-01');
    assert.equal(url, GRID_AGENTCORE);
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        kind: 'message',
        parts: [{ kind: 'data', data: { negotiation_hash: '0xabc', chain_id: 97 } }],
      },
    }), { status: 200 });
  };

  const prev = {
    GRID_A2A_CLIENT_SECRET: process.env.GRID_A2A_CLIENT_SECRET,
    AGENT_CLIENT_ID: process.env.AGENT_CLIENT_ID,
    AGENT_CLIENT_SECRET: process.env.AGENT_CLIENT_SECRET,
    AGENT_OAUTH_TOKEN_URL: process.env.AGENT_OAUTH_TOKEN_URL,
    ERC8183_A2A_BEARER: process.env.ERC8183_A2A_BEARER,
  };
  process.env.GRID_A2A_CLIENT_SECRET = 'grid-secret-from-env';
  process.env.AGENT_CLIENT_ID = 'bnbs_old_client';
  process.env.AGENT_CLIENT_SECRET = 'bnbs_old_secret';
  process.env.AGENT_OAUTH_TOKEN_URL = 'https://bnbagent-api.bnbchain.world/v1/oauth/token';
  delete process.env.ERC8183_A2A_BEARER;
  try {
    const data = await sendA2aData(
      GRID_AGENTCORE,
      { skill: 'negotiate', task_description: 'grid' },
      fetchImpl as typeof fetch,
      'grid-bnb-usdt',
    );
    assert.equal(data.negotiation_hash, '0xabc');
    assert.equal(calls[0].url, COGNITO_TOKEN_URL);
    assert.equal(calls[1].url, GRID_AGENTCORE);
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('AgentCore sendA2aData fails closed when GRID_A2A_CLIENT_SECRET is missing', async () => {
  const prev = process.env.GRID_A2A_CLIENT_SECRET;
  const bearer = process.env.ERC8183_A2A_BEARER;
  delete process.env.GRID_A2A_CLIENT_SECRET;
  process.env.ERC8183_A2A_BEARER = 'should-not-be-used';
  try {
    await assert.rejects(
      () => sendA2aData(
        GRID_AGENTCORE,
        { skill: 'negotiate' },
        async () => {
          throw new Error('fetch must not run');
        },
        'grid-bnb-usdt',
      ),
      (error: Error) => {
        assert.match(error.message, /^A2A_OAUTH_CONFIG: missing GRID_A2A_CLIENT_SECRET/);
        return true;
      },
    );
  } finally {
    if (prev === undefined) delete process.env.GRID_A2A_CLIENT_SECRET;
    else process.env.GRID_A2A_CLIENT_SECRET = prev;
    if (bearer === undefined) delete process.env.ERC8183_A2A_BEARER;
    else process.env.ERC8183_A2A_BEARER = bearer;
  }
});
