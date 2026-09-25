import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { activateWithErc8183, _setErc8183ActivateDeps, type Erc8183BuyerClient } from './activate';
import { a2aInvokeUrl, extractA2aDataPart } from './a2a';
import { ERC8183_COMMERCE, GRID_A2A_INVOKE_URL, U_TOKEN } from './constants';
import { extractNegotiationEnvelope, isQuoteExpired } from './envelope';
import { pollUntilSubmitted } from './poll';
import { revokeCommerceAllowance } from './revoke';
import { exactApproveFloor, spendCapWei } from './spend-cap';
import { buildTaskFromParams } from './task';
import type { AgentListing } from '../types';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BUYER = '0x1111111111111111111111111111111111111111';
const DELIVERABLE = 'https://example.test/deliverable/grid-plan.json';

function loadReportEnvelope() {
  const raw = readFileSync(
    join(root, 'report/agent-advantage/task-1-grid-trading/raw/negotiate-2026-09-03.json'),
    'utf8',
  ).replace(/%\s*$/, '');
  return extractNegotiationEnvelope(raw);
}

function agent(): AgentListing {
  return {
    identity: {
      agentId: 'grid-bnb-usdt',
      owner: '0x3573e861363880f18F357Ca8258FA1393573d676',
      wallet: '0x3573e861363880f18F357Ca8258FA1393573d676',
      name: 'Grid BNB / USDT',
      description: 'grid',
      endpoint: 'https://bnbagent-api.bnbchain.world/v1/rt/01M1K4SSXB6VA50K5C6FV6E4JK/.well-known/agent-card.json',
      registeredAt: 0,
    },
    category: 'grid_trading',
    categorySource: 'registration_json',
    reputation: {
      feedbackCount: { value: 0, source: { kind: 'unavailable', reason: 'test' }, updatedAt: 0 },
      score: { value: 0, source: { kind: 'unavailable', reason: 'test' }, updatedAt: 0 },
      validations: { value: 0, source: { kind: 'unavailable', reason: 'test' }, updatedAt: 0 },
    },
    metrics: {},
    status: { online: true, lastSeen: 0, responding: true, source: { kind: 'unavailable', reason: 'test' } },
    pricing: { model: 'per_task', amount: '0.10', token: 'U' },
    protocols: ['PancakeSwap'],
    capabilities: [],
    limits: [],
    source: 'onchain',
    isDemo: false,
    hireable: true,
    marketplaceId: 'grid-bnb-usdt',
  };
}

function fakeClient(calls: string[]): Erc8183BuyerClient {
  let status = 1;
  return {
    network: { commerceContract: ERC8183_COMMERCE },
    policy: { disputeWindow: async () => BigInt(86_400) },
    router: { policyWhitelist: async () => true },
    paymentToken: async () => U_TOKEN,
    createJob: async () => {
      calls.push('createJob');
      return { jobId: BigInt(42), transactionHash: '0xcreate' };
    },
    registerJob: async () => {
      calls.push('registerJob');
      return { transactionHash: '0xregister' };
    },
    setBudget: async () => {
      calls.push('setBudget');
      return { transactionHash: '0xbudget' };
    },
    fund: async (_jobId, amount, opts) => {
      calls.push(`fund:${amount.toString()}:${opts?.approveFloor?.toString() ?? 'none'}`);
      return { transactionHash: '0xfund', receipt: { status: 1 } };
    },
    tokenAllowance: async () => BigInt(0),
    approvePaymentToken: async () => {
      calls.push('revoke');
      return { transactionHash: '0xrevoke' };
    },
    getJobStatus: async () => {
      calls.push('getJobStatus');
      status = 2;
      return status;
    },
    getDeliverableUrl: async () => {
      calls.push('getDeliverableUrl');
      return DELIVERABLE;
    },
  };
}

function passThroughNotify() {
  return {
    notifyFunded: async (_agent: AgentListing, jobId: bigint) => {
      return { status: 'accepted', job_id: jobId.toString(), raw: { status: 'accepted', job_id: Number(jobId) } };
    },
  };
}

afterEach(() => {
  _setErc8183ActivateDeps(null);
});

test('extracts negotiation_hash from the saved A2A report', () => {
  const envelope = loadReportEnvelope();
  assert.equal(
    envelope.negotiation_hash,
    '0xca67d9ad9015e4fd45e726d403a2dea8514176b45266c21c73a42d855432f1b3',
  );
});

test('derives the /a2a invoke URL from an agent-card endpoint', () => {
  assert.equal(
    a2aInvokeUrl('https://bnbagent-api.bnbchain.world/v1/rt/01M1K4SSXB6VA50K5C6FV6E4JK/.well-known/agent-card.json'),
    GRID_A2A_INVOKE_URL,
  );
  assert.equal(a2aInvokeUrl(GRID_A2A_INVOKE_URL), GRID_A2A_INVOKE_URL);
});

test('extractA2aDataPart reads a notify_funded data part', () => {
  const data = extractA2aDataPart({
    jsonrpc: '2.0',
    result: {
      kind: 'message',
      parts: [{ kind: 'data', data: { status: 'accepted', job_id: 42 } }],
    },
  });
  assert.equal(data.status, 'accepted');
  assert.equal(data.job_id, 42);
});

test('buildTaskFromParams uses gridCount/lowerPrice/upperPrice/budgetCap', () => {
  assert.equal(
    buildTaskFromParams(
      { gridCount: '10', lowerPrice: '500', upperPrice: '600', budgetCap: '0.1' },
      'fallback',
    ),
    'Run a BNB/USDT grid with 10 levels between 500 and 600 USDT. Capital cap 0.1 U',
  );
});

test('buildTaskFromParams uses borrower/protocol/hfThreshold for health-factor hires', () => {
  assert.equal(
    buildTaskFromParams(
      {
        borrower: '0x1111111111111111111111111111111111111111',
        protocol: 'Venus',
        hfThreshold: '1.5',
      },
      'fallback',
    ),
    'Check Venus health factor for 0x1111111111111111111111111111111111111111 (threshold 1.5)',
  );
});

test('activateWithErc8183 runs createJob → registerJob → setBudget → fund → notify → poll', async () => {
  const envelope = loadReportEnvelope();
  const calls: string[] = [];
  let notified: string | undefined;
  const result = await activateWithErc8183(
    agent(),
    { envelope: JSON.stringify(envelope), negotiation_hash: String(envelope.negotiation_hash), budgetCap: '0.1' },
    BUYER,
    {
      now: () => (Number((envelope.response as { quote_expires_at: number }).quote_expires_at) - 10) * 1000,
      createWallet: () => ({ address: BUYER }),
      createClient: async () => fakeClient(calls),
      notifyFunded: async (_agent, jobId) => {
        notified = jobId.toString();
        return { status: 'accepted', job_id: jobId.toString(), raw: { status: 'accepted', job_id: Number(jobId) } };
      },
      pollDeliverable: async (client, jobId) => {
        calls.push('poll');
        assert.equal(jobId.toString(), '42');
        return client.getDeliverableUrl(jobId) as Promise<string>;
      },
    },
  );
  assert.deepEqual(calls, ['createJob', 'registerJob', 'setBudget', 'fund:100000000000000000:100000000000000000', 'poll', 'getDeliverableUrl']);
  assert.equal(result.receipt.approveFloorWei, '100000000000000000');
  assert.equal(result.receipt.spendCapWei, '100000000000000000');
  assert.equal(result.receipt.revokeTx, null);
  assert.equal(notified, '42');
  assert.equal(result.jobId, '42');
  assert.equal(result.status, 'SUBMITTED');
  assert.equal(result.txHash, '0xfund');
  assert.equal(result.taskId, 'erc8183:42');
  assert.equal(result.deliverableUrl, DELIVERABLE);
  assert.equal(result.receipt.negotiationHash, envelope.negotiation_hash);
});

test('missing envelope always negotiates a fresh quote', async () => {
  const envelope = loadReportEnvelope();
  const fresh = structuredClone(envelope) as typeof envelope;
  (fresh.response as { quote_expires_at: number }).quote_expires_at = 2_000_000_000;
  let negotiated = 0;
  const calls: string[] = [];
  const result = await activateWithErc8183(
    agent(),
    { gridCount: '10', lowerPrice: '500', upperPrice: '600', budgetCap: '0.1' },
    BUYER,
    {
      now: () => 1_700_000_000_000,
      createWallet: () => ({ address: BUYER }),
      createClient: async () => fakeClient(calls),
      negotiate: async (listing, task) => {
        negotiated += 1;
        assert.equal(listing.identity.agentId, 'grid-bnb-usdt');
        assert.match(task, /10 levels between 500 and 600/);
        return fresh;
      },
      ...passThroughNotify(),
      pollDeliverable: async () => DELIVERABLE,
    },
  );
  assert.equal(negotiated, 1);
  assert.equal(result.deliverableUrl, DELIVERABLE);
  assert.deepEqual(calls, ['createJob', 'registerJob', 'setBudget', 'fund:100000000000000000:100000000000000000']);
});

test('expired quote_expires_at triggers a fresh negotiate before funding', async () => {
  const envelope = loadReportEnvelope();
  const fresh = structuredClone(envelope) as typeof envelope;
  const response = fresh.response as { quote_expires_at: number };
  response.quote_expires_at = 2_000_000_000;
  let negotiated = 0;
  const calls: string[] = [];
  assert.equal(isQuoteExpired(envelope, Number((envelope.response as { quote_expires_at: number }).quote_expires_at) + 1), true);
  const result = await activateWithErc8183(
    agent(),
    { envelope: JSON.stringify(envelope), budgetCap: '0.1' },
    BUYER,
    {
      now: () => (Number((envelope.response as { quote_expires_at: number }).quote_expires_at) + 5) * 1000,
      createWallet: () => ({ address: BUYER }),
      createClient: async () => fakeClient(calls),
      negotiate: async () => {
        negotiated += 1;
        return fresh;
      },
      ...passThroughNotify(),
      pollDeliverable: async () => DELIVERABLE,
    },
  );
  assert.equal(negotiated, 1);
  assert.equal(result.jobId, '42');
  assert.deepEqual(calls, ['createJob', 'registerJob', 'setBudget', 'fund:100000000000000000:100000000000000000']);
});

test('pollUntilSubmitted waits until SUBMITTED then reads deliverable_url', async () => {
  const statuses = [1, 1, 2];
  const url = await pollUntilSubmitted(
    {
      getJobStatus: async () => statuses.shift() ?? 2,
      getDeliverableUrl: async () => DELIVERABLE,
    },
    BigInt(7),
    { sleep: async () => undefined, intervalMs: 0, maxAttempts: 5 },
  );
  assert.equal(url, DELIVERABLE);
});

test('pollUntilSubmitted retries empty deliverable_url after SUBMITTED', async () => {
  const urls: Array<string | null> = [null, null, DELIVERABLE];
  const url = await pollUntilSubmitted(
    {
      getJobStatus: async () => 2,
      getDeliverableUrl: async () => urls.shift() ?? DELIVERABLE,
    },
    BigInt(963),
    { sleep: async () => undefined, intervalMs: 0, maxAttempts: 3, urlAttempts: 12, urlIntervalMs: 0 },
  );
  assert.equal(url, DELIVERABLE);
});

test('pollUntilSubmitted throws DELIVERABLE_URL_MISSING after URL retries', async () => {
  let reads = 0;
  await assert.rejects(
    () => pollUntilSubmitted(
      {
        getJobStatus: async () => 2,
        getDeliverableUrl: async () => {
          reads += 1;
          return null;
        },
      },
      BigInt(963),
      { sleep: async () => undefined, intervalMs: 0, maxAttempts: 2, urlAttempts: 12, urlIntervalMs: 0 },
    ),
    /DELIVERABLE_URL_MISSING: job 963 is SUBMITTED/,
  );
  assert.equal(reads, 12);
});

test('activateWithErc8183 returns an already SUBMITTED job with a readable URL', async () => {
  const envelope = loadReportEnvelope();
  const calls: string[] = [];
  const result = await activateWithErc8183(
    agent(),
    { envelope: JSON.stringify(envelope) },
    BUYER,
    {
      now: () => (Number((envelope.response as { quote_expires_at: number }).quote_expires_at) - 10) * 1000,
      createWallet: () => ({ address: BUYER }),
      createClient: async () => ({
        ...fakeClient(calls),
        getJob: async (jobId: bigint) => ({
          client: BUYER,
          provider: agent().identity.wallet,
          status: 2,
          id: jobId,
        }),
        commerce: { jobCounter: async () => BigInt(963) },
        getDeliverableUrl: async () => DELIVERABLE,
      }),
      negotiate: async () => {
        throw new Error('should not negotiate when a submitted job is readable');
      },
    },
  );
  assert.equal(result.jobId, '963');
  assert.equal(result.status, 'SUBMITTED');
  assert.equal(result.deliverableUrl, DELIVERABLE);
  assert.equal(result.receipt.resumed, true);
  assert.deepEqual(calls, []);
});

test('spendCapWei parses human $U and exactApproveFloor rejects a quote above the cap', () => {
  assert.equal(spendCapWei({ budgetCap: '0.1' }).toString(), '100000000000000000');
  assert.equal(
    exactApproveFloor(BigInt('100000000000000000'), spendCapWei({ budget_cap: '0.1' })).toString(),
    '100000000000000000',
  );
  assert.throws(
    () => exactApproveFloor(BigInt('100000000000000000'), spendCapWei({ budgetCap: '0.05' })),
    /SPEND_CAP_EXCEEDED/,
  );
  assert.throws(() => spendCapWei({}), /SPEND_CAP_REQUIRED/);
});

test('activateWithErc8183 refuses to fund when the quote exceeds budgetCap', async () => {
  const envelope = loadReportEnvelope();
  const calls: string[] = [];
  await assert.rejects(
    () => activateWithErc8183(
      agent(),
      { envelope: JSON.stringify(envelope), budgetCap: '0.05' },
      BUYER,
      {
        now: () => (Number((envelope.response as { quote_expires_at: number }).quote_expires_at) - 10) * 1000,
        createWallet: () => ({ address: BUYER }),
        createClient: async () => fakeClient(calls),
        negotiate: async () => {
          throw new Error('should not renegotiate');
        },
      },
    ),
    /SPEND_CAP_EXCEEDED/,
  );
  assert.deepEqual(calls, []);
});

test('leftover commerce allowance is revoked after an exact fund', async () => {
  const envelope = loadReportEnvelope();
  const calls: string[] = [];
  const client = fakeClient(calls);
  client.tokenAllowance = async () => BigInt('50000000000000000');
  const result = await activateWithErc8183(
    agent(),
    { envelope: JSON.stringify(envelope), budgetCap: '1' },
    BUYER,
    {
      now: () => (Number((envelope.response as { quote_expires_at: number }).quote_expires_at) - 10) * 1000,
      createWallet: () => ({ address: BUYER }),
      createClient: async () => client,
      ...passThroughNotify(),
      pollDeliverable: async () => DELIVERABLE,
    },
  );
  assert.equal(result.receipt.approveFloorWei, '100000000000000000');
  assert.equal(result.receipt.revokeTx, '0xrevoke');
  assert.ok(calls.includes('revoke'));
});

test('revokeCommerceAllowance writes approve(commerce, 0)', async () => {
  const calls: string[] = [];
  const result = await revokeCommerceAllowance(BUYER, {
    createWallet: () => ({ address: BUYER }),
    createClient: async () => {
      const client = fakeClient(calls);
      client.tokenAllowance = async () => BigInt('100000000000000000');
      return client;
    },
  });
  assert.equal(result.skipped, false);
  assert.equal(result.txHash, '0xrevoke');
  assert.equal(result.spender, ERC8183_COMMERCE);
  assert.equal(result.token, U_TOKEN);
  assert.equal(result.allowanceWei, '0');
  assert.ok(calls.includes('revoke'));
});
