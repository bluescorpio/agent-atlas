import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { getCatalog } from '../../../../lib/chain/erc8004';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const owner = new URL(request.url).searchParams.get('owner');
  if (!owner || !isAddress(owner)) {
    return NextResponse.json({ error: 'owner query must be a 0x address' }, { status: 400 });
  }
  const wanted = getAddress(owner);
  const catalog = await getCatalog();
  const agents = catalog.agents.filter((a) => a.owner && getAddress(a.owner) === wanted);
  return NextResponse.json({
    chainId: catalog.chainId,
    identityRegistry: catalog.identityRegistry,
    owner: wanted,
    fetchedAt: catalog.fetchedAt,
    stale: Date.now() > catalog.staleAfter,
    count: agents.length,
    agents,
  });
}
