import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOKEN_URL =
  'https://bnbagent-850122838544.auth.us-east-1.amazoncognito.com/oauth2/token';
const SCOPE = 'bnbagent-seller/invoke';

const AGENTS = {
  'hf-guard-venus': {
    invoke:
      'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fhfguardvenus-sG614z4iLZ/invocations?qualifier=DEFAULT',
    clientId: 'chtopvung16glktss3assicu5',
    sessionId: 'hf-guard-venus-atlas-renotify-2026-09-27',
  },
  'yield-stable-router': {
    invoke:
      'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fyieldstablerouter-FscO4qDKDv/invocations?qualifier=DEFAULT',
    clientId: '5ahoiupde17urbcab90a8ekkvs',
    sessionId: 'yield-stable-router-atlas-renotify-2026-09-26',
  },
  'rebalancing-pcs-v3': {
    invoke:
      'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Frebalancingpcsv3-P5Q200A9kZ/invocations?qualifier=DEFAULT',
    clientId: '67vlfr0f7piov7em6p47hr1u7f',
    sessionId: 'rebalancing-pcs-v3-atlas-renotify-2026-09-26',
  },
  'grid-bnb-usdt': {
    invoke:
      'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fgridbnbusdt-bohsdVE5Pv/invocations?qualifier=DEFAULT',
    clientId: '3pn5ccnsb9h7utc8oic25l9iq',
    sessionId: 'grid-bnb-usdt-atlas-renotify-2026-09-26',
  },
};

function load(path, allow) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const eq = t.indexOf('=');
      const key = t.slice(0, eq).trim();
      if (allow && !allow.includes(key)) continue;
      let value = t.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value) process.env[key] = value;
    }
  } catch { /* optional */ }
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

function asRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function extractDataPart(input) {
  let value = input;
  if (typeof value === 'string') value = JSON.parse(value);
  const root = asRecord(value);
  if (!root) throw new Error('A2A_RESPONSE_INVALID');
  const rpcError = asRecord(root.error);
  if (rpcError) throw new Error(`A2A_RPC_ERROR: ${String(rpcError.message ?? JSON.stringify(rpcError))}`);
  const result = asRecord(root.result) ?? root;
  const nestedMessage = asRecord(result.message);
  const parts = Array.isArray(result.parts)
    ? result.parts
    : Array.isArray(nestedMessage?.parts)
      ? nestedMessage.parts
      : null;
  if (parts) {
    for (const part of parts) {
      const rec = asRecord(part);
      const data = rec ? asRecord(rec.data) : null;
      if (rec?.kind === 'data' && data) return data;
    }
  }
  throw new Error(`A2A_DATA_PART_REQUIRED: ${JSON.stringify(root).slice(0, 800)}`);
}

async function main() {
  const agentId = arg('--agent');
  const jobId = arg('--job');
  if (!agentId || !AGENTS[agentId] || !jobId) {
    throw new Error('Usage: npx tsx scripts/_notify-funded.mjs --agent hf-guard-venus --job 1120');
  }
  const agent = AGENTS[agentId];
  const root = process.cwd();
  load(resolve(root, '.env.local'));
  load(resolve(root, `agents/${agentId}/.studio/.env.local`), [
    'AGENTCORE_CLIENT_ID',
    'AGENTCORE_CLIENT_SECRET',
  ]);
  const clientId = process.env.AGENTCORE_CLIENT_ID || agent.clientId;
  const clientSecret = process.env.AGENTCORE_CLIENT_SECRET;
  if (!clientSecret) throw new Error(`Missing AGENTCORE_CLIENT_SECRET for ${agentId}`);

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: SCOPE,
    }),
  });
  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) throw new Error(`OAUTH_FAILED: ${tokenRes.status} ${tokenText.slice(0, 300)}`);
  const accessToken = JSON.parse(tokenText).access_token;
  if (!accessToken) throw new Error('OAUTH_FAILED: missing access_token');

  const payload = {
    jsonrpc: '2.0',
    id: 'notify-1',
    method: 'message/send',
    params: {
      message: {
        messageId: `notify-${jobId}`,
        role: 'user',
        parts: [{ kind: 'data', data: { skill: 'notify_funded', job_id: Number(jobId) } }],
      },
    },
  };
  const response = await fetch(agent.invoke, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': agent.sessionId,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`A2A_SEND_FAILED: ${response.status} ${text.slice(0, 600)}`);
  const data = extractDataPart(JSON.parse(text));
  console.log(JSON.stringify({ agent: agentId, job_id: jobId, notify: data }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
