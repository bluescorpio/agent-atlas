import Link from 'next/link';
import { getCatalog } from '../../../lib/chain/erc8004';
import type { Category } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const labels: Record<string, string> = {
  rebalancing: 'Rebalancing',
  grid_trading: 'Grid Trading',
  yield: 'Yield Optimisation',
  health_factor: 'Health Factor Monitoring',
  unclassified: 'Unclassified',
};

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: raw } = await params;
  const category = raw.replaceAll('-', '_') as Category;
  const catalog = await getCatalog();
  const agents = catalog.agents.filter((a) => a.category === category).slice(0, 48);
  const title = labels[category] ?? 'Unknown category';
  const stale = Date.now() > catalog.staleAfter;
  return (
    <main className="route-page">
      <header className="route-head">
        <Link href="/">← Agent Atlas</Link>
        <span>CHAIN 97{stale ? ' · data stale' : ''}</span>
      </header>
      <div className="route-content">
        <div className="eyebrow muted">CATEGORY · {catalog.identityRegistry}</div>
        <h1>{title}</h1>
        <p>{agents.length} registration files in this category (cap 48 on this page). Unclassified share of catalog: {catalog.total ? Math.round(catalog.unclassifiedCount / catalog.total * 100) : 0}%.</p>
        <div className="route-grid">
          {agents.map((a) => (
            <article className="route-card" key={a.erc8004Id}>
              <div className="status">
                <span className={a.hireable ? 'live-dot' : 'offline-dot'} />
                {a.hireable ? 'HIREABLE' : 'LISTED'}
              </div>
              <h2>{a.name}</h2>
              <p>{a.description.slice(0, 160)}</p>
              <div className="route-metrics"><span>agent_id {a.erc8004Id}</span></div>
              <Link className="primary" href={`/a/${a.erc8004Id}`}>View agent ↗</Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
