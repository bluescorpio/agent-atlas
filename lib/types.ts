export type Category = 'rebalancing' | 'grid_trading' | 'yield' | 'health_factor' | 'unclassified';
export type DataSource =
  | { kind: 'erc8004_identity'; chainId: number; registry: `0x${string}`; agentId: string }
  | { kind: 'erc8004_reputation'; chainId: number; registry: `0x${string}`; agentId: string }
  | { kind: 'erc8004_validation'; chainId: number; registry: `0x${string}`; agentId: string }
  | { kind: 'onchain_tx'; chainId: number; address: `0x${string}`; fromBlock: bigint; toBlock: bigint }
  | { kind: 'studio_status'; endpoint: string }
  | { kind: 'unavailable'; reason: string };
export interface Metric<T = number> { value: T; unit?: '%' | 'USD' | 'BNB' | 'count' | 'ms' | 'days'; window?: string; source: DataSource; updatedAt: number; }
export interface AgentIdentity {
  agentId: string;
  owner: `0x${string}`;
  wallet: `0x${string}`;
  name: string;
  description: string;
  endpoint?: string;
  registeredAt: number;
  erc8004Id?: number;
  registry?: `0x${string}`;
  chainId?: number;
  registrationTx?: `0x${string}`;
  tokenUri?: string;
  freshness?: { fetchedAt: number; staleAfter: number; stale: boolean };
}
export interface AgentReputation { feedbackCount: Metric<number>; score: Metric<number>; validations: Metric<number>; }
export interface CategoryMetrics { rebalancing?: { inRangePct: Metric; resets: Metric; tvlUsd: Metric }; grid_trading?: { winRatePct: Metric; window: string; maxDrawdownPct: Metric; realizedPnlUsd: Metric; trades: Metric }; yield?: { realizedAprPct: Metric; migrations: Metric; aumUsd: Metric }; health_factor?: { positionsGuarded: Metric; liquidationsPrevented: Metric; medianResponseMs: Metric }; }
export interface AgentListing {
  identity: AgentIdentity;
  category: Category;
  categorySource: 'registration_json' | 'runtime_id' | 'unclassified';
  reputation: AgentReputation;
  metrics: CategoryMetrics;
  status: { online: boolean; lastSeen: number; responding: boolean; source: DataSource };
  pricing: { model: 'per_task' | 'monthly'; amount: string; token: 'USDT' | 'U' | 'BNB' };
  protocols: string[];
  capabilities: string[];
  limits: string[];
  source: 'onchain';
  isDemo: false;
  hireable: boolean;
  marketplaceId?: string;
}
