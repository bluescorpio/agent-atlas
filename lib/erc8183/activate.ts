import { getAddress } from 'viem';
import { buildJobDescription, verifyQuoteSignature } from '@bnbagent/sdk/erc8183';
import type { AgentListing } from '../types';
import { buyerWallet, defaultBuyerClient } from './buyer';
import {
  DEFAULT_DEADLINE_MINUTES,
  ERC8183_CHAIN_ID,
  ERC8183_COMMERCE,
  ERC8183_POLICY,
  U_TOKEN,
} from './constants';
import { exactApproveFloor, spendCapWei } from './spend-cap';
import {
  assertCanonicalQuote,
  envelopeFromParamsOptional,
  isQuoteExpired,
  quotedPriceWei,
  quoteExpiresAt,
  taskDescription,
  type NegotiationEnvelope,
} from './envelope';
import { renegotiateQuote } from './negotiate';
import { notifyFunded, type NotifyFundedAck } from './notify';
import { pollUntilSubmitted, type JobPollClient } from './poll';
import { findReadableSubmittedJob, type ResumeClient } from './resume';
import { buildTaskFromParams } from './task';

export type Erc8183ActivationResult = {
  taskId: string;
  jobId: string;
  status: 'SUBMITTED';
  txHash?: `0x${string}`;
  deliverableUrl: string;
  receipt: Record<string, unknown>;
};

type TxLike = { transactionHash?: string; txHash?: string; receipt?: unknown; jobId?: bigint | number | string | null };

export type Erc8183BuyerClient = JobPollClient & {
  network: { commerceContract: string };
  publicClient?: Parameters<typeof verifyQuoteSignature>[0]['publicClient'];
  policy: { disputeWindow(): Promise<bigint> };
  router?: { policyWhitelist(policy: string): Promise<boolean> };
  paymentToken(): Promise<string>;
  createJob(opts: { provider: string; expiredAt: bigint; description: string }): Promise<TxLike>;
  registerJob(jobId: bigint): Promise<TxLike>;
  setBudget(jobId: bigint, amount: bigint): Promise<TxLike>;
  fund(jobId: bigint, amount: bigint, opts?: { approveFloor?: bigint }): Promise<TxLike>;
  tokenAllowance(owner: string, spender: string): Promise<bigint>;
  approvePaymentToken(spender: string, amount: bigint): Promise<TxLike>;
};

export type Erc8183ActivateDeps = {
  now?: () => number;
  createWallet?: () => { address: string; destroy?: () => void };
  createClient?: (wallet: { address: string }) => Promise<Erc8183BuyerClient>;
  negotiate?: (agent: AgentListing, task: string) => Promise<NegotiationEnvelope>;
  notifyFunded?: (agent: AgentListing, jobId: bigint) => Promise<NotifyFundedAck>;
  pollDeliverable?: (client: JobPollClient, jobId: bigint) => Promise<string>;
};

let injectedDeps: Erc8183ActivateDeps | null = null;

/** Test seam. Pass null to restore production factories. */
export function _setErc8183ActivateDeps(deps: Erc8183ActivateDeps | null): void {
  injectedDeps = deps;
}

function jsonSafe(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value, (_key, inner) => (typeof inner === 'bigint' ? inner.toString() : inner))) as Record<string, unknown>;
}

function txHash(result: TxLike, label: string): `0x${string}` {
  const hash = result.transactionHash ?? result.txHash;
  if (typeof hash !== 'string' || !hash.startsWith('0x')) {
    throw new Error(`ERC8183_${label.toUpperCase()}_TX_MISSING`);
  }
  return hash as `0x${string}`;
}

function deadlineMinutes(params: Record<string, string>): number {
  const raw = params.deadline_min ?? process.env.ERC8183_DEADLINE_MINUTES;
  if (!raw) return DEFAULT_DEADLINE_MINUTES;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DEADLINE_MINUTES;
}

async function resolveQuote(
  agent: AgentListing,
  params: Record<string, string>,
  task: string,
  nowMs: () => number,
  negotiate: (agent: AgentListing, task: string) => Promise<NegotiationEnvelope>,
): Promise<NegotiationEnvelope> {
  let envelope = envelopeFromParamsOptional(params);
  const nowSec = () => Math.floor(nowMs() / 1000);
  if (!envelope || isQuoteExpired(envelope, nowSec())) {
    envelope = await negotiate(agent, task);
    if (isQuoteExpired(envelope, nowSec())) {
      throw new Error('QUOTE_EXPIRED');
    }
  }
  assertCanonicalQuote(envelope);
  return envelope;
}

/**
 * Real buyer path, no mocks:
 * 1. A2A negotiate (data part) — refresh if quote_expires_at has passed (15 min TTL)
 * 2. On-chain createJob → registerJob → setBudget → fund
 * 3. A2A notify_funded with the real job_id
 * 4. Poll chain until SUBMITTED and return deliverable_url
 */
export async function activateWithErc8183(
  agent: AgentListing,
  params: Record<string, string>,
  wallet: string,
  deps: Erc8183ActivateDeps = {},
): Promise<Erc8183ActivationResult> {
  const resolved = { ...injectedDeps, ...deps };
  const nowMs = resolved.now ?? Date.now;
  const negotiate = resolved.negotiate ?? renegotiateQuote;
  const task = buildTaskFromParams(params, `Activate ${agent.identity.name}`);

  const buyer = resolved.createWallet?.() ?? buyerWallet();
  try {
    if (getAddress(wallet) !== getAddress(buyer.address)) {
      throw new Error('WALLET_MISMATCH');
    }
    const createClient = resolved.createClient ?? defaultBuyerClient;
    const client = await createClient(buyer);
    if (getAddress(client.network.commerceContract) !== getAddress(ERC8183_COMMERCE)) {
      throw new Error(`ERC8183_COMMERCE_MISMATCH: expected ${ERC8183_COMMERCE}`);
    }
    const existing = await findReadableSubmittedJob(
      client as ResumeClient,
      wallet,
      agent.identity.wallet,
    );
    if (existing) {
      return {
        taskId: `erc8183:${existing.jobId}`,
        jobId: existing.jobId,
        status: 'SUBMITTED',
        deliverableUrl: existing.deliverableUrl,
        receipt: jsonSafe({
          chainId: ERC8183_CHAIN_ID,
          commerce: ERC8183_COMMERCE,
          token: U_TOKEN,
          provider: agent.identity.wallet,
          resumed: true,
          deliverableUrl: existing.deliverableUrl,
        }),
      };
    }
    const envelope = await resolveQuote(agent, params, task, nowMs, negotiate);
    const nowSec = Math.floor(nowMs() / 1000);
    const paymentToken = await client.paymentToken();
    if (getAddress(paymentToken) !== getAddress(U_TOKEN)) {
      throw new Error(`ERC8183_TOKEN_MISMATCH: expected ${U_TOKEN}`);
    }
    if (client.router) {
      const whitelisted = await client.router.policyWhitelist(ERC8183_POLICY);
      if (!whitelisted) throw new Error('ERC8183_POLICY_NOT_WHITELISTED');
    }

    const description = buildJobDescription(envelope);
    if (client.publicClient) {
      const verdict = await verifyQuoteSignature({
        envelope: JSON.parse(description) as Record<string, unknown>,
        provider: agent.identity.wallet,
        publicClient: client.publicClient,
        expectedVerifyingContract: ERC8183_COMMERCE,
      });
      if (!verdict.valid) {
        throw new Error(`QUOTE_SIGNATURE_INVALID: ${verdict.reason}`);
      }
    }

    const rawBudget = quotedPriceWei(envelope);
    const capWei = spendCapWei(params);
    const approveFloor = exactApproveFloor(rawBudget, capWei);
    const disputeWindowSec = Number(await client.policy.disputeWindow());
    const expiredAt = BigInt(nowSec + disputeWindowSec + deadlineMinutes(params) * 60);

    const created = await client.createJob({
      provider: agent.identity.wallet,
      expiredAt,
      description,
    });
    if (created.jobId === undefined || created.jobId === null) {
      throw new Error('ERC8183_JOB_ID_MISSING');
    }
    const jobId = BigInt(created.jobId);
    const createTx = txHash(created, 'create');
    const registerTx = txHash(await client.registerJob(jobId), 'register');
    const setBudgetTx = txHash(await client.setBudget(jobId, rawBudget), 'setBudget');
    // Exact quote only — SDK default floor is 100 tokens if approveFloor is omitted.
    const funded = await client.fund(jobId, rawBudget, { approveFloor });
    const fundTx = txHash(funded, 'fund');

    let revokeTx: `0x${string}` | null = null;
    const leftover = await client.tokenAllowance(buyer.address, ERC8183_COMMERCE);
    if (leftover > BigInt(0)) {
      revokeTx = txHash(await client.approvePaymentToken(ERC8183_COMMERCE, BigInt(0)), 'revoke');
    }

    const notify = resolved.notifyFunded ?? notifyFunded;
    const ack = await notify(agent, jobId);

    const poll = resolved.pollDeliverable ?? pollUntilSubmitted;
    const deliverableUrl = await poll(client, jobId);

    return {
      taskId: `erc8183:${jobId.toString()}`,
      jobId: jobId.toString(),
      status: 'SUBMITTED',
      txHash: fundTx,
      deliverableUrl,
      receipt: jsonSafe({
        chainId: ERC8183_CHAIN_ID,
        commerce: ERC8183_COMMERCE,
        token: U_TOKEN,
        negotiationHash: envelope.negotiation_hash,
        quoteExpiresAt: quoteExpiresAt(envelope),
        provider: agent.identity.wallet,
        budgetWei: rawBudget.toString(),
        spendCapWei: capWei.toString(),
        approveFloorWei: approveFloor.toString(),
        expiredAt: expiredAt.toString(),
        task: taskDescription(envelope, task),
        createTx,
        registerTx,
        setBudgetTx,
        fundTx,
        revokeTx,
        fundReceipt: funded.receipt ?? null,
        notify: ack.raw,
        deliverableUrl,
      }),
    };
  } finally {
    buyer.destroy?.();
  }
}
