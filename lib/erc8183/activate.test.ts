import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { activateWithErc8183, _setErc8183ActivateDeps, type Erc8183BuyerClient } from './activate';
import { ERC8183_COMMERCE, U_TOKEN } from './constants';
import { extractNegotiationEnvelope, isQuoteExpired } from './envelope';
import type { AgentListing } from '../types';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const BUYER = '0x1111111111111111111111111111111111111111';

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
      endpoint: 'https://bnbagent-api.bnbchain.world/v1/rt/example/.well-known/agent-card.json',
      registeredAt: 0,
    },
    category: 'grid_trading',
    reputation: {
      feedbackCount: { value: 0, source: { kind: 'demo' }, updatedAt: 0 },
      score: { value: 0, source: { kind: 'demo' }, updatedAt: 0 },
      validations: { value: 0, source: { kind: 'demo' }, updatedAt: 0 },
    },
    metrics: {},
    status: { online: true, lastSeen: 0, source: { kind: 'demo' } },
    pricing: { model: 'per_task', amount: '0.10', token: 'U' },
    protocols: ['PancakeSwap'],
    capabilities: [],
    limits: [],
    source: 'live',
    isDemo: false,
  };
}

function fakeClient(calls: string[]): Erc8183BuyerClient {
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
    fund: async () => {
      calls.push('fund');
      return { transactionHash: '0xfund', receipt: { status: 1 } };
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

test('activateWithErc8183 runs createJob → registerJob → setBudget → fund', async () => {
  const envelope = loadReportEnvelope();
  const calls: string[] = [];
  const result = await activateWithErc8183(
    agent(),
    { envelope: JSON.stringify(envelope), negotiation_hash: String(envelope.negotiation_hash) },
    BUYER,
    {
      now: () => (Number((envelope.response as { quote_expires_at: number }).quote_expires_at) - 10) * 1000,
      createWallet: () => ({ address: BUYER }),
      createClient: async () => fakeClient(calls),
    },
  );
  assert.deepEqual(calls, ['createJob', 'registerJob', 'setBudget', 'fund']);
  assert.equal(result.jobId, '42');
  assert.equal(result.txHash, '0xfund');
  assert.equal(result.taskId, 'erc8183:42');
  assert.equal(result.receipt.negotiationHash, envelope.negotiation_hash);
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
    { envelope: JSON.stringify(envelope) },
    BUYER,
    {
      now: () => (Number((envelope.response as { quote_expires_at: number }).quote_expires_at) + 5) * 1000,
      createWallet: () => ({ address: BUYER }),
      createClient: async () => fakeClient(calls),
      negotiate: async () => {
        negotiated += 1;
        return fresh;
      },
    },
  );
  assert.equal(negotiated, 1);
  assert.equal(result.jobId, '42');
  assert.deepEqual(calls, ['createJob', 'registerJob', 'setBudget', 'fund']);
});
