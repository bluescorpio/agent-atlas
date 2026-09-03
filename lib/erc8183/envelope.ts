import { getAddress } from 'viem';
import { ERC8183_CHAIN_ID, ERC8183_COMMERCE, U_TOKEN } from './constants';

export type NegotiationEnvelope = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`NEGOTIATION_ENVELOPE_INVALID: ${error instanceof Error ? error.message : 'json'}`);
  }
}

/** Pull the SDK NegotiationResult out of a raw A2A JSON-RPC body or a bare envelope. */
export function extractNegotiationEnvelope(input: unknown): NegotiationEnvelope {
  let value = input;
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/%\s*$/, '');
    value = parseJson(trimmed);
  }
  const root = asRecord(value);
  if (!root) throw new Error('NEGOTIATION_ENVELOPE_REQUIRED');

  const rpcResult = asRecord(root.result);
  const parts = Array.isArray(rpcResult?.parts)
    ? rpcResult.parts
    : Array.isArray(root.parts)
      ? root.parts
      : null;
  if (parts) {
    for (const part of parts) {
      const rec = asRecord(part);
      const data = rec ? asRecord(rec.data) : null;
      if (rec?.kind === 'data' && data?.negotiation_hash) return data;
    }
  }
  if (typeof root.negotiation_hash === 'string') return root;
  const nested = asRecord(root.envelope) ?? asRecord(root.quote) ?? asRecord(root.negotiation);
  if (nested?.negotiation_hash) return nested;
  throw new Error('NEGOTIATION_ENVELOPE_REQUIRED');
}

export function envelopeFromParams(params: Record<string, string>): NegotiationEnvelope {
  const raw = params.envelope ?? params.quote ?? params.negotiation ?? params.negotiation_json;
  if (raw === undefined || raw === '') throw new Error('NEGOTIATION_ENVELOPE_REQUIRED');
  const envelope = extractNegotiationEnvelope(raw);
  const expectedHash = params.negotiation_hash;
  if (expectedHash && String(envelope.negotiation_hash).toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error('NEGOTIATION_HASH_MISMATCH');
  }
  return envelope;
}

function responseBlock(envelope: NegotiationEnvelope): Record<string, unknown> {
  return asRecord(envelope.response) ?? envelope;
}

export function quoteExpiresAt(envelope: NegotiationEnvelope): number | null {
  const response = responseBlock(envelope);
  const raw = response.quote_expires_at ?? envelope.quote_expires_at;
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function isQuoteExpired(envelope: NegotiationEnvelope, nowSec = Math.floor(Date.now() / 1000)): boolean {
  const expires = quoteExpiresAt(envelope);
  return expires !== null && nowSec >= expires;
}

export function quotedPriceWei(envelope: NegotiationEnvelope): bigint {
  const response = responseBlock(envelope);
  const terms = asRecord(response.terms) ?? {};
  const price = terms.price ?? envelope.price;
  if (price === undefined || price === null || price === '') {
    throw new Error('NEGOTIATED_PRICE_REQUIRED');
  }
  try {
    return BigInt(String(price));
  } catch {
    throw new Error('NEGOTIATED_PRICE_INVALID');
  }
}

export function quotedCurrency(envelope: NegotiationEnvelope): string {
  const response = responseBlock(envelope);
  const terms = asRecord(response.terms) ?? {};
  const currency = String(terms.currency ?? envelope.currency ?? '');
  if (!currency) throw new Error('NEGOTIATED_CURRENCY_REQUIRED');
  return getAddress(currency);
}

export function taskDescription(envelope: NegotiationEnvelope, fallback = ''): string {
  const request = asRecord(envelope.request);
  const task = request?.task_description ?? envelope.task_description ?? envelope.task;
  return typeof task === 'string' && task.trim() ? task : fallback;
}

export function assertCanonicalQuote(envelope: NegotiationEnvelope): void {
  const chainId = Number(envelope.chain_id ?? 0);
  if (chainId !== ERC8183_CHAIN_ID) {
    throw new Error(`QUOTE_CHAIN_MISMATCH: expected ${ERC8183_CHAIN_ID}, got ${chainId}`);
  }
  const verifying = String(envelope.verifying_contract ?? '');
  if (!verifying || getAddress(verifying) !== getAddress(ERC8183_COMMERCE)) {
    throw new Error(`QUOTE_CONTRACT_MISMATCH: expected ${ERC8183_COMMERCE}`);
  }
  if (quotedCurrency(envelope) !== getAddress(U_TOKEN)) {
    throw new Error(`QUOTE_TOKEN_MISMATCH: expected ${U_TOKEN}`);
  }
}
