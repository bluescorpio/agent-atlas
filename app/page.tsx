'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import ConnectButton from '../components/ConnectButton';
import {
  ArrowUpRight, ChevronDown, CircleHelp, ExternalLink, LayoutGrid, List, Menu,
  Search, ShieldCheck, SlidersHorizontal, Zap,
} from 'lucide-react';

type CategoryTab = 'All agents' | 'Rebalancing' | 'Grid Trading' | 'Yield Optimisation' | 'Health Factor' | 'Unclassified';
type ChainAgent = {
  erc8004Id: number;
  name: string;
  description: string;
  category: string;
  categorySource: string;
  endpoint?: string;
  protocols: string[];
  hireable: boolean;
  marketplaceId?: string;
  uriOk: boolean;
};

type AgentsResponse = {
  chainId: number;
  identityRegistry: string;
  reputationRegistry: string;
  fetchedAt: number;
  stale: boolean;
  freshnessLabel: string;
  highestAgentId: number;
  total: number;
  unclassifiedCount: number;
  unclassifiedRatio: number;
  countMethod: string;
  agents: ChainAgent[];
  error?: string;
};

const TAB_TO_CATEGORY: Record<Exclude<CategoryTab, 'All agents'>, string> = {
  Rebalancing: 'rebalancing',
  'Grid Trading': 'grid_trading',
  'Yield Optimisation': 'yield',
  'Health Factor': 'health_factor',
  Unclassified: 'unclassified',
};

const CATEGORIES: { name: Exclude<CategoryTab, 'All agents'>; icon: string; color: string }[] = [
  { name: 'Rebalancing', icon: '⌁', color: '#8ac6a7' },
  { name: 'Grid Trading', icon: '↕', color: '#e2b75c' },
  { name: 'Yield Optimisation', icon: '↗', color: '#9eb8e8' },
  { name: 'Health Factor', icon: '✦', color: '#e79b88' },
  { name: 'Unclassified', icon: '◌', color: '#9aa3b2' },
];

function categoryLabel(category: string) {
  return ({
    rebalancing: 'Rebalancing',
    grid_trading: 'Grid Trading',
    yield: 'Yield Optimisation',
    health_factor: 'Health Factor',
    unclassified: 'Unclassified',
  } as Record<string, string>)[category] ?? category;
}

export default function Home() {
  const [active, setActive] = useState<CategoryTab>('All agents');
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [payload, setPayload] = useState<AgentsResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const router = useRouter();
  const { isConnected } = useAccount();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/agents?limit=200')
      .then(async (res) => {
        const body = await res.json() as AgentsResponse;
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (!cancelled) setPayload(body);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'ERC8004_READ_FAILED');
      });
    return () => { cancelled = true; };
  }, []);

  const agents = payload?.agents ?? [];
  const filtered = useMemo(() => {
    return agents.filter((a) => {
      const tabOk = active === 'All agents' || a.category === TAB_TO_CATEGORY[active];
      const q = query.toLowerCase();
      const textOk = (a.name + a.description + a.protocols.join(' ') + String(a.erc8004Id)).toLowerCase().includes(q);
      return tabOk && textOk;
    });
  }, [agents, active, query]);

  const hireable = agents.filter((a) => a.hireable);
  const stale = payload?.stale || Boolean(loadError);

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <span>AGENT ATLAS</span>
          <em>BSC TESTNET · 97</em>
        </div>
        <nav>
          <button type="button" onClick={() => setActive('All agents')}>Explore</button>
          <button type="button" onClick={() => document.getElementById('how')?.scrollIntoView()}>How it works</button>
        </nav>
        <div className="wallet">
          <span className="live-dot" /> chain 97 <ChevronDown size={14} />
          <ConnectButton />
        </div>
        <button className="menu" type="button"><Menu size={18} /></button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> ERC-8004 ON BSC TESTNET</div>
          <h1>Hire agents.<br /><i>Read the chain.</i></h1>
          <p>
            Identity from ERC-8004 Identity Registry.<br />
            Hire via ERC-8183 when the registration file exposes an AgentCore A2A endpoint.
          </p>
        </div>
      </section>

      <section className="stats">
        <div>
          <span>HIGHEST AGENT ID</span>
          <strong>{payload ? payload.highestAgentId : '—'}</strong>
          <small>ownerOf binary search · no totalSupply in ABI</small>
        </div>
        <div>
          <span>TOKENURI ROWS READ</span>
          <strong>{payload ? payload.total : '—'}</strong>
          <small>{payload?.identityRegistry ?? 'loading registry'}</small>
        </div>
        <div>
          <span>UNCLASSIFIED</span>
          <strong>{payload ? `${Math.round((payload.unclassifiedRatio || 0) * 100)}%` : '—'}</strong>
          <small>{payload ? `${payload.unclassifiedCount} / ${payload.total}` : 'category missing in agentURI'}</small>
        </div>
        <div className="stat-note">
          Network: BSC Testnet / chain {payload?.chainId ?? 97}.
          Registry: {payload?.identityRegistry ?? '…'}
          <br />
          {stale ? <b>data stale{loadError ? ` — ${loadError}` : ''}</b> : payload ? `fresh · ${new Date(payload.fetchedAt).toISOString()}` : 'loading on-chain catalog…'}
        </div>
      </section>

      <section className="market" id="market">
        <div className="section-head">
          <div>
            <div className="eyebrow muted">THE MARKETPLACE</div>
            <h2>Find your edge.</h2>
          </div>
          <div className="market-actions">
            <div className="search">
              <Search size={15} />
              <input placeholder="Search name, id, protocol" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button className="icon-btn" type="button"><SlidersHorizontal size={16} /></button>
          </div>
        </div>
        <div className="category-tabs">
          <button type="button" className={active === 'All agents' ? 'active' : ''} onClick={() => setActive('All agents')}>
            All <span>{String(agents.length).padStart(2, '0')}</span>
          </button>
          {CATEGORIES.map((c) => {
            const count = agents.filter((a) => a.category === TAB_TO_CATEGORY[c.name]).length;
            return (
              <button key={c.name} type="button" className={active === c.name ? 'active' : ''} onClick={() => setActive(c.name)}>
                <i style={{ color: c.color }}>{c.icon}</i>
                {c.name}
                <span>{String(count).padStart(2, '0')}</span>
              </button>
            );
          })}
        </div>
        <div className="toolbar">
          <span>
            <strong>{filtered.length}</strong> shown · <strong>{hireable.length}</strong> hireable
            {stale && <> · <b>data stale</b></>}
          </span>
        </div>
        <div className="agent-grid">
          {filtered.map((a) => (
            <article className="agent-card" key={a.erc8004Id}>
              <div className="card-top">
                <div className="agent-icon">{a.hireable ? '✦' : '◌'}</div>
                <div className="status">
                  {a.hireable ? <><span className="live-dot" /> HIREABLE</> : <><span className="offline-dot" /> LISTED</>}
                  {a.uriOk ? '' : ' · URI UNREADABLE'}
                </div>
                <button
                  className={selected.includes(String(a.erc8004Id)) ? 'check selected' : 'check'}
                  type="button"
                  onClick={() => setSelected((s) => s.includes(String(a.erc8004Id)) ? s.filter((x) => x !== String(a.erc8004Id)) : s.length < 4 ? [...s, String(a.erc8004Id)] : s)}
                >
                  {selected.includes(String(a.erc8004Id)) ? '✓' : '+'}
                </button>
              </div>
              <div className="agent-title">
                <h3>{a.name}</h3>
                <span className="category-label">{categoryLabel(a.category)}</span>
              </div>
              <p>{a.description.slice(0, 180)}</p>
              <div className="protocol"><span>◈</span> {a.protocols.join(' · ') || 'protocol not in registration file'}</div>
              <div className="metrics">
                <div>
                  <span className="source" title="ERC-8004 Identity Registry">
                    agent_id {a.erc8004Id} <CircleHelp size={12} />
                  </span>
                  <small>REGISTRY ID · CHAIN 97</small>
                </div>
                <div>
                  <span className="source">{a.categorySource}</span>
                  <small>CATEGORY SOURCE</small>
                </div>
                <div>
                  <span className="source">performance history unavailable</span>
                  <small>NOT ON REGISTRY</small>
                </div>
              </div>
              <div className="card-bottom">
                <div>
                  <strong>{a.hireable ? '0.10 U' : '—'}</strong>
                  <span>{a.hireable ? 'per task' : 'not mapped for hire'}</span>
                </div>
                <div className="card-buttons">
                  <button className="ghost" type="button" onClick={() => router.push(`/a/${a.erc8004Id}`)}>
                    View <ArrowUpRight size={14} />
                  </button>
                  <button
                    className="hire"
                    type="button"
                    disabled={!a.hireable || !isConnected}
                    onClick={() => router.push(`/a/${a.erc8004Id}`)}
                  >
                    {a.hireable ? 'Activate' : 'Not hireable'} <Zap size={13} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="verification">
        <div>
          <div className="eyebrow muted">WHY AGENT ATLAS</div>
          <h2>Trust, by default.</h2>
          <p>Listings are ERC-8004 tokenURI rows on BSC testnet. Card performance is not invented.</p>
        </div>
        <div className="verify-grid">
          <div>
            <ShieldCheck size={19} />
            <h3>Onchain identity</h3>
            <p>Each card is an Identity Registry tokenId. Owner, wallet and URI are read live.</p>
          </div>
          <div>
            <span className="big-icon">⌁</span>
            <h3>No seeded metrics</h3>
            <p>Win rate / APR / TVL are omitted until computed from tx history.</p>
          </div>
          <div>
            <Zap size={19} />
            <h3>Pay as you go</h3>
            <p>Hireable rows use ERC-8183. x402 / B402 is not enabled.</p>
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="eyebrow muted">THE FLOW</div>
        <h2>From discovery to done.</h2>
        <div className="flow">
          <div><span>01</span><h3>Compare</h3><p>Read registry id, category source, and URI.</p></div>
          <div><span>02</span><h3>Set limits</h3><p>Capital cap is a hire parameter, not a slogan.</p></div>
          <div><span>03</span><h3>Activate</h3><p>ERC-8183 on BSC testnet for mapped AgentCore sellers.</p></div>
        </div>
      </section>

      {selected.length >= 2 && (
        <div className="compare-bar">
          <span>{selected.length} agents selected</span>
          <button className="primary" type="button" onClick={() => router.push(`/compare?ids=${selected.join(',')}`)}>
            Compare {selected.length} <ArrowUpRight size={14} />
          </button>
        </div>
      )}

      <footer>
        <div className="brand"><div className="brand-mark">✦</div><span>AGENT ATLAS</span></div>
        <span>BSC Testnet · chain 97 · {payload?.identityRegistry}</span>
        <span>
          {stale ? 'DATA STALE' : 'ONCHAIN'} <span className="live-dot" />
        </span>
        <a href="https://eips.ethereum.org/EIPS/eip-8004" target="_blank" rel="noreferrer">
          ERC-8004 <ExternalLink size={12} />
        </a>
      </footer>
    </main>
  );
}
