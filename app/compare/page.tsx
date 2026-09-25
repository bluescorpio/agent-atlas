import Link from 'next/link';
import { listAgentsByIds } from '../../lib/chain/erc8004';

export const dynamic = 'force-dynamic';

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids: raw } = await searchParams;
  const ids = (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const agents = await listAgentsByIds(ids.length ? ids : undefined);
  return (
    <main className="route-page">
      <header className="route-head">
        <Link href="/">← Agent Atlas</Link>
        <span>COMPARE · CHAIN 97</span>
      </header>
      <div className="route-content">
        <div className="eyebrow muted">SIDE BY SIDE</div>
        <h1>Compare agents.</h1>
        <p>Values below are from ERC-8004 registration files. Performance history is not invented.</p>
        <div className="compare-table">
          {agents.map((a) => (
            <div className="compare-col" key={a.identity.agentId}>
              <h2>{a.identity.name}</h2>
              <span>{a.category} · id {a.identity.erc8004Id}</span>
              <strong>{a.hireable ? `${a.pricing.amount} ${a.pricing.token}` : 'not hireable'}</strong>
              <p>{a.identity.description.slice(0, 200)}</p>
              <code>{a.identity.registry}</code>
              <Link className="ghost" href={`/a/${a.identity.erc8004Id}`}>Open details ↗</Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
