import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendA2aData } from './a2a';

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
