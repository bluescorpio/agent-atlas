/**
 * ERC-8183 hire against a live AgentCore seller.
 * Buyer key: agents/rebalancing-pcs-v3/.studio/.env.local (gitignored).
 * Cognito secret: agents/<id>/.studio/.env.local AGENTCORE_CLIENT_SECRET (gitignored).
 *
 *   npx tsx scripts/erc8183-hire.ts --agent hf-guard-venus --fund
 *   npx tsx scripts/erc8183-hire.ts --agent yield-stable-router --fund
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOKEN_URL =
  'https://bnbagent-850122838544.auth.us-east-1.amazoncognito.com/oauth2/token';
const SCOPE = 'bnbagent-seller/invoke';
const EXPECTED_BUYER = '0x81122d2Ea08B5c61b899949fc9b9C3735C972414';

const AGENTS = {
  'hf-guard-venus': {
    invoke:
      'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fhfguardvenus-sG614z4iLZ/invocations?qualifier=DEFAULT',
    clientId: 'chtopvung16glktss3assicu5',
    seller: '0xaaBd845B763761af98eE516a2a08829AEf548Cf3',
    sessionId: 'hf-guard-venus-atlas-buyer-session-01xxxx',
    task:
      'Read Venus Comptroller.getAccountLiquidity for 0x1111111111111111111111111111111111111111 plus vToken.balanceOf, borrowBalanceStored, and supplyRatePerBlock. Return JSON {address, comptroller, accountLiquidity, vtokenPositions, healthAssessment, recommendedActions}. Never invent numbers.',
    terms: {
      deliverables:
        'JSON Venus health snapshot from getAccountLiquidity / vToken balances / supplyRatePerBlock',
      quality_standards:
        'read-only contract views only; do not repay or add collateral; do not invent numbers; no_position is valid',
    },
  },
  'yield-stable-router': {
    invoke:
      'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fyieldstablerouter-FscO4qDKDv/invocations?qualifier=DEFAULT',
    clientId: '5ahoiupde17urbcab90a8ekkvs',
    seller: '0xec2edaf39738Fd92B095dD1c8d10B39074f1B0bE',
    sessionId: 'yield-stable-router-atlas-buyer-session-01',
    task:
      'Read Venus vToken.supplyRatePerBlock and borrowRatePerBlock plus ERC-20 symbol/decimals. Lista APR is only from these job terms (no Lista contract view): listaSupplyAprPercent=1.528. Return JSON {asset, venus, lista, recommendation, reasoning}. Never invent numbers.',
    terms: {
      deliverables:
        'JSON Venus vs Lista USDT yield comparison; Venus rates from chain views; Lista APR only from job terms',
      quality_standards:
        'read-only; do not supply, borrow, or migrate; do not invent APYs; Lista is terms-only',
    },
  },
} as const;

type AgentId = keyof typeof AGENTS;

function loadDotEnv(path: string, override = false, allow?: string[]) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (allow && !allow.includes(key)) continue;
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!value) continue;
      if (process.env[key] === undefined || override) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractDataPart(input: unknown): Record<string, unknown> {
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
  throw new Error(`A2A_DATA_PART_REQUIRED: ${JSON.stringify(root).slice(0, 500)}`);
}

async function accessToken(clientId: string, clientSecret: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: SCOPE,
  });
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`OAUTH_FAILED: ${response.status} ${text.slice(0, 300)}`);
  const json = JSON.parse(text) as { access_token?: string };
  if (!json.access_token) throw new Error('OAUTH_FAILED: missing access_token');
  return json.access_token;
}

async function messageSend(
  invokeUrl: string,
  sessionId: string,
  token: string,
  rpcId: string,
  messageId: string,
  data: Record<string, unknown>,
): Promise<{ httpStatus: number; data: Record<string, unknown> }> {
  const payload = {
    jsonrpc: '2.0',
    id: rpcId,
    method: 'message/send',
    params: {
      message: {
        messageId,
        role: 'user',
        parts: [{ kind: 'data', data }],
      },
    },
  };
  const response = await fetch(invokeUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  if (!response.ok) throw new Error(`A2A_SEND_FAILED: ${response.status} ${text.slice(0, 400)}`);
  return { httpStatus: response.status, data: extractDataPart(parsed) };
}

function buyerPrivateKey(): `0x${string}` {
  const raw = process.env.ERC8183_BUYER_PRIVATE_KEY?.trim();
  if (!raw) throw new Error('ERC8183_BUYER_PRIVATE_KEY_REQUIRED');
  const key = (raw.startsWith('0x') ? raw : `0x${raw}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error('ERC8183_BUYER_PRIVATE_KEY_INVALID');
  return key;
}

async function fundOnChain(
  seller: string,
  envelope: Record<string, unknown>,
): Promise<{
  jobId: bigint;
  buyer: string;
  client: {
    getJobStatus(jobId: bigint): Promise<number | string>;
    getDeliverableUrl(jobId: bigint): Promise<string | null>;
  };
  destroy: () => void;
}> {
  const privateKey = buyerPrivateKey();
  const { getAddress } = await import('viem');
  const { privateKeyToAccount } = await import('viem/accounts');
  const buyer = privateKeyToAccount(privateKey).address;
  if (getAddress(buyer) !== getAddress(EXPECTED_BUYER)) {
    throw new Error(`BUYER_ADDRESS_MISMATCH: derived ${buyer}, expected ${EXPECTED_BUYER}`);
  }
  console.log(JSON.stringify({ step: 'buyer', address: buyer, provider: seller }, null, 2));
  if (!process.env.RPC_URL && process.env.BSC_TESTNET_RPC_URL) {
    process.env.RPC_URL = process.env.BSC_TESTNET_RPC_URL;
  }
  const { ERC8183Client, buildJobDescription } = await import('@bnbagent/sdk/erc8183');
  const { EVMWalletProvider } = await import('@bnbagent/sdk/wallets');
  const wallet = new EVMWalletProvider({
    password: process.env.ERC8183_BUYER_KEYSTORE_PASSWORD || 'atlas-ephemeral',
    privateKey,
    persist: false,
  });
  const client = await ERC8183Client.create({ walletProvider: wallet, network: 'bsc-testnet' });
  const description = buildJobDescription(envelope);
  const terms = asRecord(asRecord(envelope.response)?.terms) ?? asRecord(envelope.terms) ?? {};
  const price = terms.price ?? envelope.price;
  if (price === undefined || price === null || price === '') throw new Error('NEGOTIATED_PRICE_REQUIRED');
  const rawBudget = BigInt(String(price));
  const disputeWindowSec = Number(await client.policy.disputeWindow());
  const expiredAt = BigInt(Math.floor(Date.now() / 1000) + disputeWindowSec + 30 * 60);
  const created = await client.createJob({ provider: seller, expiredAt, description });
  if (created.jobId === undefined || created.jobId === null) throw new Error('ERC8183_JOB_ID_MISSING');
  const jobId = BigInt(created.jobId);
  console.log(JSON.stringify({ step: 'createJob', jobId: jobId.toString(), tx: created.transactionHash ?? created.txHash }, null, 2));
  const registered = await client.registerJob(jobId);
  console.log(JSON.stringify({ step: 'registerJob', tx: registered.transactionHash ?? registered.txHash }, null, 2));
  const budgeted = await client.setBudget(jobId, rawBudget);
  console.log(JSON.stringify({ step: 'setBudget', budgetWei: rawBudget.toString(), tx: budgeted.transactionHash ?? budgeted.txHash }, null, 2));
  const funded = await client.fund(jobId, rawBudget, { approveFloor: rawBudget });
  console.log(JSON.stringify({ step: 'fund', tx: funded.transactionHash ?? funded.txHash }, null, 2));
  return { jobId, buyer, client, destroy: () => wallet.destroy?.() };
}

async function main() {
  const agentId = argValue('--agent') as AgentId | undefined;
  if (!agentId || !(agentId in AGENTS)) {
    throw new Error('Usage: npx tsx scripts/erc8183-hire.ts --agent hf-guard-venus|yield-stable-router --fund');
  }
  const agent = AGENTS[agentId];
  const root = process.cwd();
  loadDotEnv(resolve(root, '.env.local'));
  loadDotEnv(resolve(root, 'agents/rebalancing-pcs-v3/.studio/.env.local'), true, ['ERC8183_BUYER_PRIVATE_KEY']);
  loadDotEnv(resolve(root, `agents/${agentId}/.studio/.env.local`), true, [
    'AGENTCORE_CLIENT_ID',
    'AGENTCORE_CLIENT_SECRET',
  ]);

  const clientId = process.env.AGENTCORE_CLIENT_ID || agent.clientId;
  const clientSecret = process.env.AGENTCORE_CLIENT_SECRET;
  if (!clientSecret) throw new Error(`Missing AGENTCORE_CLIENT_SECRET for ${agentId}`);

  console.log(JSON.stringify({ agent: agentId, client_id: clientId, seller: agent.seller }, null, 2));
  const token = await accessToken(clientId, clientSecret);
  console.log(JSON.stringify({ step: 'oauth', token_ok: true, session_id: agent.sessionId }, null, 2));

  const quote = await messageSend(agent.invoke, agent.sessionId, token, 'request-1', 'message-1', {
    skill: 'negotiate',
    task_description: agent.task,
    terms: agent.terms,
  });
  console.log(JSON.stringify({ step: 'negotiate', httpStatus: quote.httpStatus, signed_quote: quote.data }, null, 2));

  const funded = await fundOnChain(agent.seller, quote.data);
  try {
    const ack = await messageSend(agent.invoke, agent.sessionId, token, 'request-2', 'message-2', {
      skill: 'notify_funded',
      job_id: Number(funded.jobId),
    });
    console.log(JSON.stringify({ step: 'notify_funded', httpStatus: ack.httpStatus, ack: ack.data }, null, 2));
    const { pollUntilSubmitted } = await import('../lib/erc8183/poll.ts');
    const deliverableUrl = await pollUntilSubmitted(funded.client, funded.jobId, {
      maxAttempts: 96,
      intervalMs: 5_000,
    });
    const status = await funded.client.getJobStatus(funded.jobId);
    console.log(JSON.stringify({
      agent: agentId,
      job_id: funded.jobId.toString(),
      chain_status: status,
      status: 'SUBMITTED',
      deliverable_url: deliverableUrl,
    }, null, 2));
  } finally {
    funded.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
