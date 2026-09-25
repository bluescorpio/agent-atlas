import { NextResponse } from 'next/server';
import { getCatalog } from '../../../lib/chain/erc8004';
import type { Category } from '../../../lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const hireableOnly = url.searchParams.get('hireable') === '1';
  const category = url.searchParams.get('category') as Category | null;
  const limit = Math.min(Number(url.searchParams.get('limit') || '48') || 48, 200);
  const offset = Math.max(Number(url.searchParams.get('offset') || '0') || 0, 0);
  const owner = url.searchParams.get('owner');

  try {
    const catalog = await getCatalog();
    let agents = [...catalog.agents];
    agents.sort((a, b) => Number(b.hireable) - Number(a.hireable) || b.erc8004Id - a.erc8004Id);
    if (hireableOnly) agents = agents.filter((a) => a.hireable);
    if (category) agents = agents.filter((a) => a.category === category);
    if (owner) {
      return NextResponse.json({
        error: 'Use GET /api/agents/by-owner?owner=0x... for owner filters (needs ownerOf).',
      }, { status: 400 });
    }
    const slice = agents.slice(offset, offset + limit);
    const stale = Date.now() > catalog.staleAfter;
    return NextResponse.json({
      chainId: catalog.chainId,
      identityRegistry: catalog.identityRegistry,
      reputationRegistry: catalog.reputationRegistry,
      fetchedAt: catalog.fetchedAt,
      staleAfter: catalog.staleAfter,
      stale,
      freshnessLabel: stale ? 'data stale' : 'fresh',
      highestAgentId: catalog.highestAgentId,
      total: catalog.total,
      unclassifiedCount: catalog.unclassifiedCount,
      unclassifiedRatio: catalog.total ? catalog.unclassifiedCount / catalog.total : 0,
      countMethod: 'highest ownerOf binary search + tokenURI multicall; Identity ABI has no totalSupply/tokenByIndex',
      offset,
      limit,
      returned: slice.length,
      filteredTotal: agents.length,
      agents: slice,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ERC8004_READ_FAILED';
    return NextResponse.json({ error: message, stale: true, freshnessLabel: 'data stale' }, { status: 503 });
  }
}
