import { parseAbiItem } from 'viem';
import type { AgentListing, AgentReputation, Category } from '../types';
import { identityRegistryAbi, reputationRegistryAbi } from './abi/erc8004';
import { getRegistryAddresses } from './addresses';
import { cached } from './cache';
import { CHAIN_ID, publicClient } from './client';
import { overlayFor } from './overlay';
import {
  a2aEndpointFromRegistration,
  categoryFromRegistration,
  decodeAgentUri,
  liveAgentIdFromEndpoint,
  protocolsFromRegistration,
} from './registration';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;
const CATALOG_TTL_MS = 10 * 60 * 1000;
const STALE_AFTER_MS = 15 * 60 * 1000;
const URI_BATCH = 200;

const REGISTERED_EVENT = parseAbiItem(
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
);

export type CatalogAgent = {
  erc8004Id: number;
  name: string;
  description: string;
  category: Category;
  categorySource: AgentListing['categorySource'];
  endpoint?: string;
  protocols: string[];
  capabilities: string[];
  limits: string[];
  hireable: boolean;
  marketplaceId?: string;
  uriOk: boolean;
  owner?: `0x${string}`;
  fetchedAt: number;
};

export type Catalog = {
  fetchedAt: number;
  staleAfter: number;
  identityRegistry: `0x${string}`;
  reputationRegistry: `0x${string}`;
  chainId: number;
  highestAgentId: number;
  total: number;
  unclassifiedCount: number;
  agents: CatalogAgent[];
};

function unavailableReputation(fetchedAt: number, reason: string): AgentReputation {
  const source = { kind: 'unavailable' as const, reason };
  return {
    feedbackCount: { value: 0, unit: 'count', source, updatedAt: fetchedAt },
    score: { value: 0, source, updatedAt: fetchedAt },
    validations: { value: 0, unit: 'count', source, updatedAt: fetchedAt },
  };
}

async function ownerExists(id: bigint): Promise<boolean> {
  const { identity } = getRegistryAddresses();
  try {
    await publicClient.readContract({
      address: identity,
      abi: identityRegistryAbi,
      functionName: 'ownerOf',
      args: [id],
    });
    return true;
  } catch {
    return false;
  }
}

/** Highest existing tokenId. Identity ABI has no totalSupply / tokenByIndex. */
export async function getHighestAgentId(): Promise<number> {
  return cached('highest-agent-id', async () => {
    if (!(await ownerExists(BigInt(1)))) return 0;
    let lo = BigInt(1);
    let hi = BigInt(2);
    while (await ownerExists(hi)) {
      lo = hi;
      hi *= BigInt(2);
      if (hi > BigInt(10_000_000)) break;
    }
    while (lo + BigInt(1) < hi) {
      const mid = (lo + hi) / BigInt(2);
      if (await ownerExists(mid)) lo = mid;
      else hi = mid;
    }
    return Number(lo);
  }, 60_000);
}

export async function getRegisteredAgentCount(): Promise<number> {
  return getHighestAgentId();
}

async function readTokenUri(id: bigint): Promise<string | null> {
  const { identity } = getRegistryAddresses();
  try {
    const uri = await publicClient.readContract({
      address: identity,
      abi: identityRegistryAbi,
      functionName: 'tokenURI',
      args: [id],
    });
    return typeof uri === 'string' ? uri : null;
  } catch {
    return null;
  }
}

function catalogFromUri(erc8004Id: number, uri: string, fetchedAt: number): CatalogAgent {
  const file = decodeAgentUri(uri);
  const endpoint = a2aEndpointFromRegistration(file);
  const { category, source } = categoryFromRegistration(file, endpoint);
  const marketplaceId = liveAgentIdFromEndpoint(endpoint) ?? undefined;
  return {
    erc8004Id,
    name: file?.name?.trim() || `Agent ${erc8004Id}`,
    description: file?.description?.trim() || 'Registration file has no description.',
    category,
    categorySource: source,
    endpoint,
    protocols: protocolsFromRegistration(file),
    capabilities: file?.capabilities ?? [],
    limits: file?.limits ?? [],
    hireable: Boolean(marketplaceId),
    marketplaceId,
    uriOk: Boolean(file),
    fetchedAt,
  };
}

export async function getCatalog(): Promise<Catalog> {
  return cached('erc8004-catalog', async () => {
    const { identity, reputation } = getRegistryAddresses();
    const highestAgentId = await getHighestAgentId();
    const fetchedAt = Date.now();
    const agents: CatalogAgent[] = [];
    for (let start = 1; start <= highestAgentId; start += URI_BATCH) {
      const end = Math.min(start + URI_BATCH - 1, highestAgentId);
      const ids: bigint[] = [];
      for (let id = start; id <= end; id += 1) ids.push(BigInt(id));
      const result = await publicClient.multicall({
        contracts: ids.map((id) => ({
          address: identity,
          abi: identityRegistryAbi,
          functionName: 'tokenURI' as const,
          args: [id],
        })),
        allowFailure: true,
      });
      const owners = await publicClient.multicall({
        contracts: ids.map((id) => ({
          address: identity,
          abi: identityRegistryAbi,
          functionName: 'ownerOf' as const,
          args: [id],
        })),
        allowFailure: true,
      });
      result.forEach((row, index) => {
        const id = Number(ids[index]);
        if (row.status !== 'success' || typeof row.result !== 'string') return;
        const entry = catalogFromUri(id, row.result, fetchedAt);
        const ownerRow = owners[index];
        if (ownerRow.status === 'success' && typeof ownerRow.result === 'string') {
          entry.owner = ownerRow.result as `0x${string}`;
        }
        agents.push(entry);
      });
    }
    const unclassifiedCount = agents.filter((a) => a.category === 'unclassified').length;
    return {
      fetchedAt,
      staleAfter: fetchedAt + STALE_AFTER_MS,
      identityRegistry: identity,
      reputationRegistry: reputation,
      chainId: CHAIN_ID,
      highestAgentId,
      total: agents.length,
      unclassifiedCount,
      agents,
    };
  }, CATALOG_TTL_MS);
}

export async function getRegistrationTx(agentId: bigint): Promise<`0x${string}` | undefined> {
  return cached(`registered-tx:${agentId}`, async () => {
    const { identity } = getRegistryAddresses();
    const latest = await publicClient.getBlockNumber();
    const span = BigInt(5_000_000);
    const fromBlock = latest > span ? latest - span : BigInt(0);
    try {
      const logs = await publicClient.getLogs({
        address: identity,
        event: REGISTERED_EVENT,
        args: { agentId },
        fromBlock,
        toBlock: latest,
      });
      const hash = logs.at(-1)?.transactionHash;
      return hash;
    } catch {
      return undefined;
    }
  }, CATALOG_TTL_MS);
}

export async function getAgentIdentity(agentId: string) {
  const listing = await getAgentListing(agentId);
  return listing?.identity ?? null;
}

export async function getAgentReputation(agentId: string): Promise<AgentReputation | null> {
  const listing = await getAgentListing(agentId);
  return listing?.reputation ?? null;
}

export async function listAgentsByIds(ids?: string[]): Promise<AgentListing[]> {
  const catalog = await getCatalog();
  let wanted = ids?.length
    ? catalog.agents.filter((a) => ids.includes(String(a.erc8004Id)) || (a.marketplaceId && ids.includes(a.marketplaceId)))
    : [
        ...catalog.agents.filter((a) => a.hireable),
        ...catalog.agents.slice(-24).filter((a) => !a.hireable),
      ];
  const seen = new Set<number>();
  wanted = wanted.filter((a) => {
    if (seen.has(a.erc8004Id)) return false;
    seen.add(a.erc8004Id);
    return true;
  });
  return Promise.all(wanted.map((row) => hydrateListing(row, catalog)));
}

export async function getAgentListing(id: string): Promise<AgentListing | null> {
  const catalog = await getCatalog();
  const row = catalog.agents.find(
    (a) => String(a.erc8004Id) === id || a.marketplaceId === id,
  );
  if (!row) return null;
  return hydrateListing(row, catalog);
}

async function hydrateListing(row: CatalogAgent, catalog: Catalog): Promise<AgentListing> {
  const { identity } = getRegistryAddresses();
  const tokenId = BigInt(row.erc8004Id);
  let owner: `0x${string}` = ZERO_ADDRESS;
  let wallet: `0x${string}` = ZERO_ADDRESS;
  try {
    const [ownerRead, walletRead] = await Promise.all([
      publicClient.readContract({
        address: identity,
        abi: identityRegistryAbi,
        functionName: 'ownerOf',
        args: [tokenId],
      }),
      publicClient.readContract({
        address: identity,
        abi: identityRegistryAbi,
        functionName: 'getAgentWallet',
        args: [tokenId],
      }),
    ]);
    owner = ownerRead as `0x${string}`;
    wallet = (walletRead as `0x${string}`) || owner;
  } catch {
    /* keep zero; page will show stale / not responding */
  }

  let tokenUri: string | undefined;
  try {
    tokenUri = await readTokenUri(tokenId) ?? undefined;
  } catch {
    tokenUri = undefined;
  }

  const registrationTx = await getRegistrationTx(tokenId);
  const fetchedAt = Date.now();
  const stale = fetchedAt > catalog.staleAfter;
  const responding = Boolean(row.endpoint);
  const extra = overlayFor(row.erc8004Id);
  const reputation = await readReputationSummary(tokenId);

  return {
    identity: {
      agentId: String(row.erc8004Id),
      owner,
      wallet,
      name: extra?.agentId && row.name === `Agent ${row.erc8004Id}` ? extra.agentId : row.name,
      description: row.description,
      endpoint: row.endpoint,
      registeredAt: catalog.fetchedAt,
      erc8004Id: row.erc8004Id,
      registry: catalog.identityRegistry,
      chainId: catalog.chainId,
      registrationTx,
      tokenUri,
      freshness: { fetchedAt, staleAfter: catalog.staleAfter, stale },
    },
    category: row.category,
    categorySource: row.categorySource,
    reputation,
    metrics: {},
    status: {
      online: responding,
      lastSeen: fetchedAt,
      responding,
      source: row.endpoint
        ? { kind: 'studio_status', endpoint: row.endpoint }
        : { kind: 'unavailable', reason: 'No A2A service in registration file' },
    },
    pricing: extra?.pricing ?? { model: 'per_task', amount: '0.10', token: 'U' },
    protocols: row.protocols.length ? row.protocols : (extra?.protocols ?? []),
    capabilities: (row.capabilities.length ? row.capabilities : extra?.capabilities) ?? [],
    limits: (row.limits.length ? row.limits : extra?.limits) ?? ['Registration file does not list limits'],
    source: 'onchain',
    isDemo: false,
    hireable: row.hireable,
    marketplaceId: row.marketplaceId ?? extra?.agentId,
  };
}

export async function readReputationSummary(agentId: bigint): Promise<AgentReputation> {
  const { reputation } = getRegistryAddresses();
  const fetchedAt = Date.now();
  try {
    const summary = await publicClient.readContract({
      address: reputation,
      abi: reputationRegistryAbi,
      functionName: 'getSummary',
      args: [agentId, [], '', ''],
    });
    const [count, summaryValue, decimals] = summary as readonly [bigint, bigint, number];
    const source = {
      kind: 'erc8004_reputation' as const,
      chainId: CHAIN_ID,
      registry: reputation,
      agentId: agentId.toString(),
    };
    const scale = 10 ** Number(decimals || 0);
    const score = scale > 0 ? Number(summaryValue) / scale : Number(summaryValue);
    return {
      feedbackCount: { value: Number(count), unit: 'count', source, updatedAt: fetchedAt },
      score: { value: score, source, updatedAt: fetchedAt },
      validations: { value: 0, unit: 'count', source: { kind: 'unavailable', reason: 'Validation registry not wired' }, updatedAt: fetchedAt },
    };
  } catch {
    return unavailableReputation(fetchedAt, 'Reputation Registry getSummary failed');
  }
}
