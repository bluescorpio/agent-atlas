/**
 * Buyer-side A2A client for the live rebalancing-pcs-v3 AgentCore runtime.
 *
 * Default: OAuth2 client_credentials → POST negotiate → print the signed quote.
 * Optional:
 *   --notify-funded <job_id>  after you funded on-chain yourself
 *   --fund                 createJob → registerJob → setBudget → fund → notify_funded
 *                             (needs ERC8183_BUYER_PRIVATE_KEY)
 *
 * Required env:
 *   AGENTCORE_CLIENT_ID       (defaults to this runtime's Cognito app client)
 *   AGENTCORE_CLIENT_SECRET   from the Cognito console (not the old bnbs_* Studio secret)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INVOKE_URL =
  'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Frebalancingpcsv3-P5Q200A9kZ/invocations?qualifier=DEFAULT';
const TOKEN_URL =
  'https://bnbagent-850122838544.auth.us-east-1.amazoncognito.com/oauth2/token';
const SCOPE = 'bnbagent-seller/invoke';
const DEFAULT_CLIENT_ID = '67vlfr0f7piov7em6p47hr1u7f';
const SESSION_ID = 'rebalancing-pcs-v3-atlas-buyer-session-01';
const SELLER_WALLET = '0x48566287e8afDE4Eb7550f44f778E4C1a3B2EC32';

const SAMPLE_TASK =
  'Read PancakeSwap V3 pool.slot0, liquidity, token0, and token1. Return JSON {pool, currentPrice, tick, range, inRange, recommendedAction, reasoning}. Never invent numbers.';
const SAMPLE_TERMS = {
  deliverables:
    'JSON snapshot of slot0/liquidity/token0/token1 and a hold|rebalance recommendation cited from those views',
  quality_standards:
    'read-only contract views only; do not mint, burn, collect, or move LP; do not invent numbers',
};

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
    // optional
  }
}

const root = process.cwd();
loadDotEnv(resolve(root, '.env.local'));
// Seller workspace secrets stay in .studio; only the buyer key is needed here.
loadDotEnv(resolve(root, 'agents/rebalancing-pcs-v3/.studio/.env.local'), true, ['ERC8183_BUYER_PRIVATE_KEY']);

function argFlag(name: string): boolean {
  return process.argv.includes(name);
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
  if (rpcError) {
    throw new Error(`A2A_RPC_ERROR: ${String(rpcError.message ?? JSON.stringify(rpcError))}`);
  }
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
  if (!response.ok) {
    throw new Error(`OAUTH_FAILED: ${response.status} ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as { access_token?: string };
  if (!json.access_token) throw new Error('OAUTH_FAILED: missing access_token');
  return json.access_token;
}

async function messageSend(
  token: string,
  rpcId: string,
  messageId: string,
  data: Record<string, unknown>,
): Promise<{ httpStatus: number; raw: unknown; data: Record<string, unknown> }> {
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
  const response = await fetch(INVOKE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': SESSION_ID,
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
  if (!response.ok) {
    throw new Error(`A2A_SEND_FAILED: ${response.status} ${text.slice(0, 400)}`);
  }
  return { httpStatus: response.status, raw: parsed, data: extractDataPart(parsed) };
}

type FundedJob = {
  jobId: bigint;
  buyer: string;
  client: {
    getJobStatus(jobId: bigint): Promise<number | string>;
    getDeliverableUrl(jobId: bigint): Promise<string | null>;
  };
  destroy: () => void;
};

function buyerPrivateKey(): `0x${string}` {
  const raw = process.env.ERC8183_BUYER_PRIVATE_KEY?.trim();
  if (!raw) throw new Error('ERC8183_BUYER_PRIVATE_KEY_REQUIRED');
  const key = (raw.startsWith('0x') ? raw : `0x${raw}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error('ERC8183_BUYER_PRIVATE_KEY_INVALID');
  return key;
}

async function fundOnChain(envelope: Record<string, unknown>): Promise<FundedJob> {
  const privateKey = buyerPrivateKey();
  const { privateKeyToAccount } = await import('viem/accounts');
  const buyer = privateKeyToAccount(privateKey).address;
  console.log(JSON.stringify({ step: 'buyer', address: buyer, provider: SELLER_WALLET }, null, 2));

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
  const client = await ERC8183Client.create({
    walletProvider: wallet,
    network: 'bsc-testnet',
  });
  const description = buildJobDescription(envelope);
  const terms = asRecord(asRecord(envelope.response)?.terms) ?? asRecord(envelope.terms) ?? {};
  const price = terms.price ?? envelope.price;
  if (price === undefined || price === null || price === '') {
    throw new Error('NEGOTIATED_PRICE_REQUIRED');
  }
  const rawBudget = BigInt(String(price));
  const disputeWindowSec = Number(await client.policy.disputeWindow());
  const expiredAt = BigInt(Math.floor(Date.now() / 1000) + disputeWindowSec + 30 * 60);
  const created = await client.createJob({
    provider: SELLER_WALLET,
    expiredAt,
    description,
  });
  if (created.jobId === undefined || created.jobId === null) {
    throw new Error('ERC8183_JOB_ID_MISSING');
  }
  const jobId = BigInt(created.jobId);
  console.log(JSON.stringify({ step: 'createJob', jobId: jobId.toString(), tx: created.transactionHash ?? created.txHash }, null, 2));
  const registered = await client.registerJob(jobId);
  console.log(JSON.stringify({ step: 'registerJob', tx: registered.transactionHash ?? registered.txHash }, null, 2));
  const budgeted = await client.setBudget(jobId, rawBudget);
  console.log(JSON.stringify({ step: 'setBudget', budgetWei: rawBudget.toString(), tx: budgeted.transactionHash ?? budgeted.txHash }, null, 2));
  const funded = await client.fund(jobId, rawBudget, { approveFloor: rawBudget });
  console.log(JSON.stringify({ step: 'fund', tx: funded.transactionHash ?? funded.txHash }, null, 2));
  return {
    jobId,
    buyer,
    client,
    destroy: () => wallet.destroy?.(),
  };
}

async function chainClientOnly(): Promise<FundedJob> {
  const privateKey = buyerPrivateKey();
  const { privateKeyToAccount } = await import('viem/accounts');
  const buyer = privateKeyToAccount(privateKey).address;
  if (!process.env.RPC_URL && process.env.BSC_TESTNET_RPC_URL) {
    process.env.RPC_URL = process.env.BSC_TESTNET_RPC_URL;
  }
  const { ERC8183Client } = await import('@bnbagent/sdk/erc8183');
  const { EVMWalletProvider } = await import('@bnbagent/sdk/wallets');
  const wallet = new EVMWalletProvider({
    password: process.env.ERC8183_BUYER_KEYSTORE_PASSWORD || 'atlas-ephemeral',
    privateKey,
    persist: false,
  });
  const client = await ERC8183Client.create({
    walletProvider: wallet,
    network: 'bsc-testnet',
  });
  return { jobId: 0n, buyer, client, destroy: () => wallet.destroy?.() };
}

async function main() {
  const clientId = process.env.AGENTCORE_CLIENT_ID || DEFAULT_CLIENT_ID;
  const clientSecret = process.env.AGENTCORE_CLIENT_SECRET;
  if (!clientSecret) {
    console.error(
      [
        'Missing AGENTCORE_CLIENT_SECRET.',
        `Cognito client_id is ${clientId}.`,
        'Studio does not store the secret. Paste it from AWS Cognito → user pool us-east-1_yx8QfJRRu → app client 67vlfr0f7piov7em6p47hr1u7f.',
        'Then: AGENTCORE_CLIENT_SECRET=... npx tsx scripts/call-rebalancing-pcs-v3.ts',
        'Do not reuse AGENT_CLIENT_SECRET=bnbs_* (that is the old bnbagent-api OAuth, not this Cognito app).',
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log('1) requesting Cognito access_token…');
  const token = await accessToken(clientId, clientSecret);
  console.log(JSON.stringify({ token_ok: true, token_prefix: `${token.slice(0, 8)}…`, session_id: SESSION_ID }, null, 2));

  console.log('2) POST negotiate (data part)…');
  const quote = await messageSend(token, 'request-1', 'message-1', {
    skill: 'negotiate',
    task_description: SAMPLE_TASK,
    terms: SAMPLE_TERMS,
  });
  console.log(JSON.stringify({ httpStatus: quote.httpStatus, signed_quote: quote.data }, null, 2));

  const notifyJob = argValue('--notify-funded');
  const shouldFund = argFlag('--fund') || (!notifyJob && Boolean(process.env.ERC8183_BUYER_PRIVATE_KEY));
  if (!notifyJob && !shouldFund) {
    console.log('Stopped after negotiate. Pass --fund (pays U on-chain) or --notify-funded <job_id> to continue.');
    return;
  }

  let jobId = notifyJob ? BigInt(notifyJob) : 0n;
  let funded: FundedJob | undefined;
  try {
    if (shouldFund) {
      console.log('3) funding on-chain createJob → registerJob → setBudget → fund (0.1 U)…');
      funded = await fundOnChain(quote.data);
      jobId = funded.jobId;
    } else if (process.env.ERC8183_BUYER_PRIVATE_KEY) {
      funded = await chainClientOnly();
    }

    console.log(`4) POST notify_funded job_id=${jobId.toString()}…`);
    const ack = await messageSend(token, 'request-2', 'message-2', {
      skill: 'notify_funded',
      job_id: Number(jobId),
    });
    console.log(JSON.stringify({ httpStatus: ack.httpStatus, ack: ack.data }, null, 2));

    if (!funded) {
      console.log('No chain client (notify-only). Poll ERC-8183 yourself for SUBMITTED / deliverable_url.');
      return;
    }
    console.log('5) polling commerce for SUBMITTED + deliverable_url…');
    const { pollUntilSubmitted } = await import('../lib/erc8183/poll.ts');
    const deliverableUrl = await pollUntilSubmitted(funded.client, jobId, {
      maxAttempts: 96,
      intervalMs: 5_000,
    });
    console.log(JSON.stringify({ job_id: jobId.toString(), status: 'SUBMITTED', deliverable_url: deliverableUrl }, null, 2));
  } finally {
    funded?.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
