import registry from '../registry.json';
import type { AgentListing, Category } from '../types';

const names: Record<string, string> = {
  'grid-bnb-usdt': 'Grid BNB / USDT', 'grid-alpha-v2': 'Grid Alpha v2',
  'lp-range-keeper': 'LP Range Keeper', 'range-pilot': 'Range Pilot',
  'stable-router': 'Stable Router', 'yield-scout': 'Yield Scout',
  'venus-guardian': 'Venus Guardian', 'hf-sentinel': 'HF Sentinel',
};
const descriptions: Record<Category, string> = {
  rebalancing: 'Keeps concentrated liquidity in range and resets when price exits.',
  grid_trading: 'Runs a disciplined grid within your price range, re-posting after every fill.',
  yield: 'Routes stablecoin liquidity to the highest realised APR across trusted venues.',
  health_factor: 'Monitors borrow positions and acts before liquidation.',
};
const values: Record<string, number[]> = {
  'grid-bnb-usdt': [68.4, -8.2, 1320, 42], 'grid-alpha-v2': [72.1, -11.4, 2180, 58],
  'lp-range-keeper': [91.6, 14, 184000, 0], 'range-pilot': [87.3, 9, 96000, 0],
  'stable-router': [14.8, 6, 1200000, 0], 'yield-scout': [12.6, 3, 420000, 0],
  'venus-guardian': [24, 7, 420, 0], 'hf-sentinel': [11, 4, 680, 0],
};

export function getMockAgents(): AgentListing[] {
  return registry.map((r, i) => {
    const v = values[r.agentId]; const now = Date.now();
    const metric = (value: number, unit?: any, window?: string) => ({ value, unit, window, source: { kind: 'demo' as const }, updatedAt: now });
    let metrics: AgentListing['metrics'];
    if (r.category === 'grid_trading') metrics = { grid_trading: { winRatePct: metric(v[0], '%', '30d'), window: '30d', maxDrawdownPct: metric(v[1], '%', '30d'), realizedPnlUsd: metric(v[2], 'USD', '30d'), trades: metric(v[3], 'count', '30d') } };
    else if (r.category === 'rebalancing') metrics = { rebalancing: { inRangePct: metric(v[0], '%', '30d'), resets: metric(v[1], 'count', '30d'), tvlUsd: metric(v[2], 'USD', '30d') } };
    else if (r.category === 'yield') metrics = { yield: { realizedAprPct: metric(v[0], '%', '30d'), migrations: metric(v[1], 'count', '30d'), aumUsd: metric(v[2], 'USD', '30d') } };
    else metrics = { health_factor: { positionsGuarded: metric(v[0], 'count', '30d'), liquidationsPrevented: metric(v[1], 'count', '30d'), medianResponseMs: metric(v[2], 'ms', '30d') } };
    const source = r.source === 'live' ? 'live' as const : 'demo' as const;
    const statusSource = source === 'live'
      ? { kind: 'studio_status' as const, endpoint: r.endpoint }
      : { kind: 'demo' as const };
    const erc8004Id = typeof (r as { erc8004Id?: number }).erc8004Id === 'number'
      ? (r as { erc8004Id: number }).erc8004Id
      : undefined;
    return { identity: { agentId: r.agentId, owner: r.wallet as `0x${string}`, wallet: r.wallet as `0x${string}`, name: names[r.agentId], description: descriptions[r.category as Category], endpoint: r.endpoint, registeredAt: r.deployedAt, erc8004Id }, category: r.category as Category, reputation: { feedbackCount: metric(38 + i, 'count'), score: metric(4.5 + i / 10), validations: metric(8 + i, 'count') }, metrics, status: { online: i !== 3, lastSeen: now, source: statusSource }, pricing: r.pricing as AgentListing['pricing'], protocols: r.protocols, capabilities: r.capabilities, limits: r.limits, source, isDemo: source !== 'live' };
  });
}
export function getMockAgent(id: string) { return getMockAgents().find(a => a.identity.agentId === id); }
