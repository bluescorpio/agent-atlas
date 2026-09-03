'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import ConnectButton from '../components/ConnectButton';
import {
  ArrowUpRight, ChevronDown, CircleHelp, ExternalLink, LayoutGrid, List, Menu,
  Search, ShieldCheck, SlidersHorizontal, X, Zap,
} from 'lucide-react';

type Category = 'All agents' | 'Rebalancing' | 'Grid Trading' | 'Yield Optimisation' | 'Health Factor';
type Agent = {
  id: string;
  name: string;
  category: Exclude<Category, 'All agents'>;
  protocol: string;
  online: boolean;
  price: string;
  unit: string;
  description: string;
  metrics: [string, string, string];
  accent: string;
  icon: string;
  score: string;
  source: 'live' | 'demo';
  wallet?: string;
};

/** Keep listing metadata aligned with `lib/registry.json`. Metrics remain demo until onchain history lands. */
const agents: Agent[] = [
  {
    id: 'grid-bnb-usdt',
    name: 'Grid BNB / USDT',
    category: 'Grid Trading',
    protocol: 'PancakeSwap',
    online: true,
    price: '0.10',
    unit: 'U per task',
    description: 'Runs a disciplined grid within your price range, re-posting orders after every fill.',
    metrics: ['68.4% win rate', '30 day window', '−8.2% max drawdown'],
    accent: '#e2b75c',
    icon: '↕',
    score: '4.9',
    source: 'live',
    wallet: '0x3573e861363880f18F357Ca8258FA1393573d676',
  },
  { id: 'grid-alpha-v2', name: 'Grid Alpha v2', category: 'Grid Trading', protocol: 'Thena', online: true, price: '7.00', unit: 'USDT per task', description: 'Adaptive grid that widens spacing as volatility expands.', metrics: ['72.1% win rate', '30 day window', '−11.4% max drawdown'], accent: '#e2b75c', icon: '◫', score: '4.7', source: 'demo' },
  { id: 'lp-range-keeper', name: 'LP Range Keeper', category: 'Rebalancing', protocol: 'PancakeSwap v3', online: true, price: '12', unit: 'USDT monthly', description: 'Keeps your concentrated liquidity in range and resets when price exits.', metrics: ['91.6% in-range', '14 resets', ' $184K TVL'], accent: '#8ac6a7', icon: '⌁', score: '4.8', source: 'demo' },
  { id: 'range-pilot', name: 'Range Pilot', category: 'Rebalancing', protocol: 'PancakeSwap v3', online: false, price: '8', unit: 'USDT monthly', description: 'A conservative range manager tuned for lower gas and fewer resets.', metrics: ['87.3% in-range', '9 resets', ' $96K TVL'], accent: '#8ac6a7', icon: '◌', score: '4.6', source: 'demo' },
  { id: 'stable-router', name: 'Stable Router', category: 'Yield Optimisation', protocol: 'Venus · Lista', online: true, price: '9', unit: 'USDT monthly', description: 'Routes stablecoin liquidity to the highest realised APR across trusted venues.', metrics: ['14.8% actual APR', '6 migrations', ' $1.2M managed'], accent: '#9eb8e8', icon: '↗', score: '4.9', source: 'demo' },
  { id: 'yield-scout', name: 'Yield Scout', category: 'Yield Optimisation', protocol: 'Lista', online: true, price: '5.00', unit: 'USDT per task', description: 'Scans lending markets for spread and moves only when the edge clears gas.', metrics: ['12.6% actual APR', '3 migrations', ' $420K managed'], accent: '#9eb8e8', icon: '⌘', score: '4.5', source: 'demo' },
  { id: 'venus-guardian', name: 'Venus Guardian', category: 'Health Factor', protocol: 'Venus', online: true, price: '15', unit: 'USDT monthly', description: 'Monitors your borrow position and repays or adds collateral before liquidation.', metrics: ['24 positions guarded', '7 liquidations prevented', '420ms response'], accent: '#e79b88', icon: '✦', score: '4.9', source: 'demo' },
  { id: 'hf-sentinel', name: 'HF Sentinel', category: 'Health Factor', protocol: 'Lista Lending', online: true, price: '10', unit: 'USDT monthly', description: 'A lightweight health factor watcher with configurable alert thresholds.', metrics: ['11 positions guarded', '4 liquidations prevented', '680ms response'], accent: '#e79b88', icon: '◈', score: '4.7', source: 'demo' },
];

const categories: { name: Exclude<Category, 'All agents'>; icon: string; text: string; color: string }[] = [
  { name: 'Rebalancing', icon: '⌁', text: 'Keep LP positions in range.', color: '#8ac6a7' },
  { name: 'Grid Trading', icon: '↕', text: 'Automate orders, capture volatility.', color: '#e2b75c' },
  { name: 'Yield Optimisation', icon: '↗', text: 'Route liquidity to real yield.', color: '#9eb8e8' },
  { name: 'Health Factor', icon: '✦', text: 'Protect positions from liquidation.', color: '#e79b88' },
];

function DemoSource({ children }: { children: React.ReactNode }) {
  return (
    <span className="source" title="Demo data — not from onchain history">
      {children}
      <CircleHelp size={12} />
    </span>
  );
}

export default function Home() {
  const [active, setActive] = useState<Category>('All agents');
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('Performance');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [detail, setDetail] = useState<Agent | null>(null);
  const [activated, setActivated] = useState<Agent[]>([]);
  const [stopped, setStopped] = useState<string[]>([]);
  const router = useRouter();
  const { isConnected } = useAccount();

  const liveAgents = useMemo(() => agents.filter((a) => a.source === 'live'), []);
  const availableToHire = liveAgents.length;
  const onlineLive = liveAgents.filter((a) => a.online).length;
  const demoCount = agents.filter((a) => a.source === 'demo').length;

  const filtered = useMemo(() => {
    const list = agents.filter(
      (a) =>
        (active === 'All agents' || a.category === active) &&
        (a.name + a.protocol).toLowerCase().includes(query.toLowerCase()),
    );
    return [...list].sort((a, b) =>
      sort === 'Price'
        ? parseFloat(a.price) - parseFloat(b.price)
        : sort === 'Name'
          ? a.name.localeCompare(b.name)
          : b.score.localeCompare(a.score),
    );
  }, [active, query, sort]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s));

  const hire = (a: Agent) => {
    if (a.source !== 'live') return;
    router.push(`/a/${a.id}`);
  };

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <span>AGENT ATLAS</span>
          <em>BSC MARKETPLACE</em>
        </div>
        <nav>
          <button type="button" onClick={() => setActive('All agents')}>Explore</button>
          <button type="button" onClick={() => document.getElementById('how')?.scrollIntoView()}>How it works</button>
          <button type="button" onClick={() => document.getElementById('my-agents')?.scrollIntoView()}>
            My agents {activated.length > 0 && <b>{activated.length}</b>}
          </button>
        </nav>
        <div className="wallet">
          <span className="live-dot" /> BSC · testnet hire <ChevronDown size={14} />
          <ConnectButton />
        </div>
        <button className="menu" type="button"><Menu size={18} /></button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> LIVE AGENT ON BSC TESTNET</div>
          <h1>Hire agents.<br /><i>Move capital.</i></h1>
          <p>
            Discover autonomous agents with onchain identity.<br />
            Set your limits. Hire via ERC-8183.
          </p>
          <button className="primary" type="button" onClick={() => document.getElementById('market')?.scrollIntoView()}>
            Explore agents <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="hero-art">
          <div className="constellation">
            <span className="node n1" /><span className="node n2" /><span className="node n3" /><span className="node n4" />
            <span className="line l1" /><span className="line l2" /><span className="line l3" />
          </div>
          <div className="orbit-label ol1" title="Onchain agent identity registration (ERC-8004). Reputation and performance figures are labelled separately.">
            ERC-8004 <small>VERIFIED</small>
          </div>
          <div className="orbit-label ol2">ERC-8183 <small>PAYMENTS</small></div>
          <div className="orbit-label ol3">BNB CHAIN <small>TESTNET</small></div>
          <div className="core">✦<span>ATLAS<br /><small>AGENT NETWORK</small></span></div>
        </div>
      </section>

      <section className="stats">
        <div>
          <span>ERC-8004 REGISTERED AGENTS</span>
          <strong><DemoSource>200,000+</DemoSource></strong>
          <small>Demo data · network-wide estimate</small>
        </div>
        <div>
          <span>AVAILABLE TO HIRE</span>
          <strong>{String(availableToHire).padStart(2, '0')}</strong>
          <small>Live listings only · ERC-8183</small>
        </div>
        <div>
          <span>ONLINE NOW</span>
          <strong className="green">{String(onlineLive).padStart(2, '0')}</strong>
          <small>Live · BSC testnet</small>
        </div>
        <div className="stat-note">
          ERC-8004 VERIFIED means identity registration. Card metrics are Demo data unless labelled otherwise.
          <br />
          <a href="https://eips.ethereum.org/EIPS/eip-8004" target="_blank" rel="noreferrer">
            Learn about verification <ArrowUpRight size={12} />
          </a>
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
              <input placeholder="Search agents or protocols" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button className="icon-btn" type="button"><SlidersHorizontal size={16} /></button>
          </div>
        </div>
        <div className="category-tabs">
          <button type="button" className={active === 'All agents' ? 'active' : ''} onClick={() => setActive('All agents')}>
            All agents <span>{String(agents.length).padStart(2, '0')}</span>
          </button>
          {categories.map((c) => {
            const count = agents.filter((a) => a.category === c.name).length;
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
            <strong>{filtered.length}</strong> listings · <strong>{availableToHire}</strong> live · {demoCount} demo
          </span>
          <div>
            <button
              className="sort"
              type="button"
              onClick={() => setSort(sort === 'Performance' ? 'Price' : sort === 'Price' ? 'Name' : 'Performance')}
            >
              Sort: {sort} <ChevronDown size={13} />
            </button>
            <button className={view === 'grid' ? 'view active' : 'view'} type="button" onClick={() => setView('grid')}>
              <LayoutGrid size={15} />
            </button>
            <button className={view === 'list' ? 'view active' : 'view'} type="button" onClick={() => setView('list')}>
              <List size={15} />
            </button>
          </div>
        </div>
        <div className={view === 'grid' ? 'agent-grid' : 'agent-list'}>
          {filtered.map((a) => (
            <article className="agent-card" key={a.id} style={{ '--accent': a.accent } as React.CSSProperties}>
              <div className="card-top">
                <div className="agent-icon">{a.icon}</div>
                <div className="status">
                  {a.source === 'live' ? (
                    <><span className="live-dot" /> LIVE</>
                  ) : (
                    <><span className="offline-dot" /> DEMO</>
                  )}
                  {' · '}
                  {a.online ? 'ONLINE' : 'OFFLINE'}
                </div>
                <button
                  className={selected.includes(a.id) ? 'check selected' : 'check'}
                  type="button"
                  onClick={() => toggle(a.id)}
                  aria-label="Compare"
                >
                  {selected.includes(a.id) ? '✓' : '+'}
                </button>
              </div>
              <div className="agent-title">
                <h3>{a.name}</h3>
                <span className="category-label">{a.category}</span>
              </div>
              <p>{a.description}</p>
              <div className="protocol"><span>◈</span> {a.protocol}</div>
              <div className="metrics">
                {a.metrics.map((m, i) => (
                  <div key={m}>
                    <DemoSource>{m}</DemoSource>
                    <small>{['PRIMARY METRIC · DEMO', '30 DAY WINDOW · DEMO', 'RISK PROFILE · DEMO'][i]}</small>
                  </div>
                ))}
              </div>
              <div className="card-bottom">
                <div>
                  <strong>{a.source === 'live' ? `${a.price} ${a.unit.split(' ')[0]}` : `$${a.price}`}</strong>
                  <span>{a.source === 'live' ? a.unit.replace(/^\S+\s/, '') : a.unit}</span>
                </div>
                <div className="card-buttons">
                  <button className="ghost" type="button" onClick={() => setDetail(a)}>
                    View <ArrowUpRight size={14} />
                  </button>
                  <button
                    className="hire"
                    type="button"
                    onClick={() => hire(a)}
                    disabled={a.source !== 'live' || !a.online || !isConnected}
                  >
                    {a.source === 'live' ? 'Activate' : 'Demo only'} <Zap size={13} />
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
          <p>
            Live agent data from ERC-8004 + ERC-8183 on BSC testnet;<br />
            other listings are demo.
          </p>
        </div>
        <div className="verify-grid">
          <div>
            <ShieldCheck size={19} />
            <h3>Onchain identity</h3>
            <p>ERC-8004 registration, owner and wallet are public for the live agent. That is identity — not a performance claim.</p>
          </div>
          <div>
            <span className="big-icon">⌁</span>
            <h3>Performance labels</h3>
            <p>Win rate, APR and drawdown on cards are Demo data — not yet computed from onchain history.</p>
          </div>
          <div>
            <Zap size={19} />
            <h3>Pay as you go</h3>
            <p>Live hire uses ERC-8183 (negotiate → fund → notify_funded). x402 / B402 is not enabled yet.</p>
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="eyebrow muted">THE FLOW</div>
        <h2>From discovery to done.</h2>
        <div className="flow">
          <div><span>01</span><h3>Compare</h3><p>Scan the metrics that matter for your strategy.</p></div>
          <div><span>02</span><h3>Set limits</h3><p>Define exactly how much capital an agent can touch.</p></div>
          <div><span>03</span><h3>Activate</h3><p>Hire the live agent over ERC-8183 on BSC testnet.</p></div>
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

      <section className="my-agents" id="my-agents">
        <div className="section-head">
          <div>
            <div className="eyebrow muted">YOUR COMMAND CENTER</div>
            <h2>My agents <span className="count-pill">{activated.length}</span></h2>
          </div>
          <button className="ghost" type="button" onClick={() => setActive('All agents')}>
            Browse marketplace <ArrowUpRight size={14} />
          </button>
        </div>
        {activated.length === 0 ? (
          <div className="empty">
            <div>✦</div>
            <p>No active agents yet.</p>
            <span>Hire the live Grid BNB / USDT agent to see it here.</span>
          </div>
        ) : (
          <div className="active-list">
            {activated.map((a, i) => (
              <div className="active-row" key={`${a.id}-${i}`}>
                <div className="agent-icon" style={{ background: `${a.accent}22`, color: a.accent }}>{a.icon}</div>
                <div>
                  <strong>{a.name}</strong>
                  <span>{a.category} · Activated</span>
                </div>
                <span className="status">
                  <span className={stopped.includes(a.id) ? 'offline-dot' : 'live-dot'} />
                  {stopped.includes(a.id) ? 'STOPPED' : 'RUNNING'}
                </span>
                <button
                  className="stop"
                  type="button"
                  onClick={() =>
                    setStopped((x) => (x.includes(a.id) ? x.filter((id) => id !== a.id) : [...x, a.id]))
                  }
                >
                  {stopped.includes(a.id) ? 'Start' : 'Stop'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        <div className="brand"><div className="brand-mark">✦</div><span>AGENT ATLAS</span></div>
        <span>Built for BNB Chain · Main Track + TermiX Challenge</span>
        <span>{availableToHire} LIVE · {demoCount} DEMO <span className="live-dot" /></span>
      </footer>

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" type="button" onClick={() => setDetail(null)}><X size={18} /></button>
            <div className="detail-head">
              <div className="agent-icon" style={{ background: `${detail.accent}22`, color: detail.accent }}>{detail.icon}</div>
              <div>
                <div className="eyebrow muted">{detail.category.toUpperCase()}</div>
                <h2>{detail.name}</h2>
                <span className="status">
                  <span className={detail.online ? 'live-dot' : 'offline-dot'} />
                  {detail.source === 'live' ? 'LIVE' : 'DEMO'} · {detail.online ? 'ONLINE' : 'OFFLINE'} · {detail.protocol}
                </span>
              </div>
            </div>
            <p>{detail.description}</p>
            <div className="detail-metrics">
              {detail.metrics.map((m, i) => (
                <div key={m}>
                  <strong><DemoSource>{m}</DemoSource></strong>
                  <small>{['PRIMARY METRIC · DEMO', '30 DAY WINDOW · DEMO', 'RISK PROFILE · DEMO'][i]}</small>
                </div>
              ))}
            </div>
            <div className="identity">
              <h4>ERC-8004 IDENTITY</h4>
              <code>{detail.source === 'live' ? 'ERC-8004 agent_id 2066 · marketplace id grid-bnb-usdt' : `demo://${detail.id}`}</code>
              {detail.wallet ? (
                <a href={`https://bscscan.com/address/${detail.wallet}`} target="_blank" rel="noreferrer">
                  Wallet on BscScan <ExternalLink size={12} />
                </a>
              ) : (
                <p className="fine">Demo listing — not deployed onchain.</p>
              )}
              <p className="fine">
                ERC-8004 VERIFIED covers identity registration. Reputation and card metrics below remain Demo data.
              </p>
            </div>
            <div className="capabilities">
              <h4>WHAT IT DOES</h4>
              <p>Automates the strategy within your limits{detail.source === 'live' ? ' and delivers over ERC-8183' : ''}.</p>
              <h4>WHAT IT WON&apos;T DO</h4>
              <p>Exceed the capital cap or act outside approved protocols.</p>
            </div>
            <div className="sticky-activate">
              <div>
                <strong>{detail.source === 'live' ? `${detail.price} U` : `$${detail.price}`}</strong>
                <span>{detail.unit}</span>
              </div>
              <button
                className="hire"
                type="button"
                onClick={() => { setDetail(null); hire(detail); }}
                disabled={detail.source !== 'live' || !detail.online}
              >
                {detail.source === 'live' ? 'Activate' : 'Demo only'} <Zap size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
