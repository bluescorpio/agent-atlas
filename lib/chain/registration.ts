import type { Category } from '../types';
import { AGENTCORE_A2A_CLIENTS, type LiveAgentId } from '../erc8183/agentcore-oauth';

export type RegistrationFile = {
  name?: string;
  description?: string;
  type?: string;
  category?: string;
  tags?: string[];
  protocols?: string[];
  capabilities?: string[];
  limits?: string[];
  services?: Array<{ name?: string; endpoint?: string; version?: string }>;
  registrations?: Array<{ agentId?: number; agentRegistry?: string }>;
};

export type CategorySource = 'registration_json' | 'runtime_id' | 'unclassified';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function decodeAgentUri(uri: string): RegistrationFile | null {
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:application/json')) {
    const comma = trimmed.indexOf(',');
    if (comma < 0) return null;
    const payload = trimmed.slice(comma + 1);
    const header = trimmed.slice(0, comma).toLowerCase();
    const jsonText = header.includes('base64')
      ? Buffer.from(payload, 'base64').toString('utf8')
      : decodeURIComponent(payload);
    try {
      return JSON.parse(jsonText) as RegistrationFile;
    } catch {
      return null;
    }
  }
  return null;
}

const CATEGORY_VALUES: Category[] = ['grid_trading', 'rebalancing', 'yield', 'health_factor'];

function coerceCategory(raw: unknown): Category | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((CATEGORY_VALUES as string[]).includes(key)) return key as Category;
  if (key === 'grid' || key === 'gridtrading') return 'grid_trading';
  if (key === 'health' || key === 'healthfactor') return 'health_factor';
  return null;
}

export function a2aEndpointFromRegistration(file: RegistrationFile | null): string | undefined {
  const services = file?.services ?? [];
  for (const service of services) {
    const endpoint = service.endpoint?.trim();
    if (!endpoint) continue;
    if (/bedrock-agentcore/i.test(endpoint) || /\/a2a$/i.test(endpoint)) {
      return endpoint.replace(/\/\.well-known\/agent-card\.json/i, '');
    }
  }
  const first = services.find((s) => s.endpoint)?.endpoint?.trim();
  return first;
}

export function liveAgentIdFromEndpoint(endpoint: string | undefined): LiveAgentId | null {
  if (!endpoint) return null;
  const decoded = decodeURIComponent(endpoint);
  for (const config of Object.values(AGENTCORE_A2A_CLIENTS)) {
    if (decoded.includes(config.runtimeMarker) || endpoint.includes(config.runtimeMarker)) {
      return config.agentId;
    }
  }
  return null;
}

export function categoryFromRegistration(
  file: RegistrationFile | null,
  endpoint?: string,
): { category: Category; source: CategorySource } {
  const fromJson = coerceCategory(file?.category)
    ?? (file?.tags ?? []).map(coerceCategory).find((x): x is Category => Boolean(x));
  if (fromJson) return { category: fromJson, source: 'registration_json' };

  const liveId = liveAgentIdFromEndpoint(endpoint ?? a2aEndpointFromRegistration(file));
  if (liveId === 'grid-bnb-usdt') return { category: 'grid_trading', source: 'runtime_id' };
  if (liveId === 'rebalancing-pcs-v3') return { category: 'rebalancing', source: 'runtime_id' };
  if (liveId === 'hf-guard-venus') return { category: 'health_factor', source: 'runtime_id' };
  if (liveId === 'yield-stable-router') return { category: 'yield', source: 'runtime_id' };

  return { category: 'unclassified', source: 'unclassified' };
}

export function protocolsFromRegistration(file: RegistrationFile | null): string[] {
  if (!file?.protocols?.length) return [];
  return file.protocols.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim());
}

export function asRegistrationRecord(value: unknown): RegistrationFile | null {
  return asRecord(value) as RegistrationFile | null;
}
