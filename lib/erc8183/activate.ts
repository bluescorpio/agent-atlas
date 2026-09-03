import { getAddress } from 'viem';
import {
  buildJobDescription,
  ERC8183Client,
  verifyQuoteSignature,
} from '@bnbagent/sdk/erc8183';
import { EVMWalletProvider } from '@bnbagent/sdk/wallets';
import type { AgentListing } from '../types';
import {
  DEFAULT_DEADLINE_MINUTES,
  ERC8183_CHAIN_ID,
  ERC8183_COMMERCE,
  ERC8183_NETWORK,
  ERC8183_POLICY,
  U_TOKEN,
} from './constants';
import {
  assertCanonicalQuote,
  envelopeFromParams,
  isQuoteExpired,
  quotedPriceWei,
  taskDescription,
  type NegotiationEnvelope,
} from './envelope';
import { renegotiateQuote } from './negotiate';

export type Erc8183ActivationResult = {
  taskId: string;
  jobId: string;
  txHash: `0x${string}`;
  receipt: Record<string, unknown>;
};

type TxLike = { transactionHash?: string; txHash?: string; receipt?: unknown; jobId?: bigint | number | string | null };

export type Erc8183BuyerClient = {
  network: { commerceContract: string };
  publicClient?: Parameters<typeof verifyQuoteSignature>[0]['publicClient'];
  policy: { disputeWindow(): Promise<bigint> };
  router?: { policyWhitelist(policy: string): Promise<boolean> };
  paymentToken(): Promise<string>;
  createJob(opts: { provider: string; expiredAt: bigint; description: string }): Promise<TxLike>;
  registerJob(jobId: bigint): Promise<TxLike>;
  setBudget(jobId: bigint, amount: bigint): Promise<TxLike>;
  fund(jobId: bigint, amount: bigint, opts?: { approveFloor?: bigint }): Promise<TxLike>;
};

export type Erc8183ActivateDeps = {
  now?: () => number;
  createWallet?: () => { address: string; destroy?: () => void };
  createClient?: (wallet: { address: string }) => Promise<Erc8183BuyerClient>;
  negotiate?: (agent: AgentListing, task: string) => Promise<NegotiationEnvelope>;
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

function buyerWallet() {
  const privateKey = process.env.ERC8183_BUYER_PRIVATE_KEY;
  if (!privateKey) throw new Error('ERC8183_BUYER_PRIVATE_KEY_REQUIRED');
  return new EVMWalletProvider({
    password: process.env.ERC8183_BUYER_KEYSTORE_PASSWORD || 'atlas-ephemeral',
    privateKey,
    persist: false,
  });
}

async function defaultClient(wallet: { address: string }): Promise<Erc8183BuyerClient> {
  if (!process.env.RPC_URL && (process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL_BSC_TESTNET)) {
    process.env.RPC_URL = process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL_BSC_TESTNET;
  }
  return ERC8183Client.create({
    walletProvider: wallet as EVMWalletProvider,
    network: ERC8183_NETWORK,
  });
}

function deadlineMinutes(params: Record<string, string>): number {
  const raw = params.deadline_min ?? process.env.ERC8183_DEADLINE_MINUTES;
  if (!raw) return DEFAULT_DEADLINE_MINUTES;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DEADLINE_MINUTES;
}

/**
 * Buyer path: anchor an already-signed ERC-8183 quote on-chain.
 * createJob → registerJob → setBudget → fund.
 */
export async function activateWithErc8183(
  agent: AgentListing,
  params: Record<string, string>,
  wallet: string,
  deps: Erc8183ActivateDeps = {},
): Promise<Erc8183ActivationResult> {
  const resolved = { ...injectedDeps, ...deps };
  const nowSec = Math.floor((resolved.now?.() ?? Date.now()) / 1000);
  let envelope = envelopeFromParams(params);
  const task = params.task || taskDescription(envelope, `Activate ${agent.identity.name}`);
  if (isQuoteExpired(envelope, nowSec)) {
    const negotiate = resolved.negotiate ?? renegotiateQuote;
    envelope = await negotiate(agent, task);
    if (isQuoteExpired(envelope, Math.floor((resolved.now?.() ?? Date.now()) / 1000))) {
      throw new Error('QUOTE_EXPIRED');
    }
  }
  assertCanonicalQuote(envelope);

  const buyer = resolved.createWallet?.() ?? buyerWallet();
  try {
    if (getAddress(wallet) !== getAddress(buyer.address)) {
      throw new Error('WALLET_MISMATCH');
    }
    const createClient = resolved.createClient ?? defaultClient;
    const client = await createClient(buyer);
    if (getAddress(client.network.commerceContract) !== getAddress(ERC8183_COMMERCE)) {
      throw new Error(`ERC8183_COMMERCE_MISMATCH: expected ${ERC8183_COMMERCE}`);
    }
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
    const funded = await client.fund(jobId, rawBudget, { approveFloor: rawBudget });
    const fundTx = txHash(funded, 'fund');

    return {
      taskId: `erc8183:${jobId.toString()}`,
      jobId: jobId.toString(),
      txHash: fundTx,
      receipt: jsonSafe({
        chainId: ERC8183_CHAIN_ID,
        commerce: ERC8183_COMMERCE,
        token: U_TOKEN,
        negotiationHash: envelope.negotiation_hash,
        provider: agent.identity.wallet,
        budgetWei: rawBudget.toString(),
        expiredAt: expiredAt.toString(),
        createTx,
        registerTx,
        setBudgetTx,
        fundTx,
        fundReceipt: funded.receipt ?? null,
      }),
    };
  } finally {
    buyer.destroy?.();
  }
}
