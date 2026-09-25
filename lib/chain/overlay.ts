import overlay from '../registry.json';

type OverlayRow = {
  agentId: string;
  name?: string;
  category: string;
  source: string;
  erc8004Id?: number;
  protocols?: string[];
  pricing?: { model: 'per_task' | 'monthly'; amount: string; token: 'USDT' | 'U' | 'BNB' };
  capabilities?: string[];
  limits?: string[];
};

const rows = (overlay as OverlayRow[]).filter((row) => row.source === 'live' && typeof row.erc8004Id === 'number');

export function overlayFor(erc8004Id: number): OverlayRow | undefined {
  return rows.find((row) => row.erc8004Id === erc8004Id);
}
