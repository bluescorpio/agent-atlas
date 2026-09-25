import type { DataSource } from '../types';

export async function getAgentStatus(endpoint?: string): Promise<{
  online: boolean;
  lastSeen: number;
  source: DataSource;
}> {
  if (!endpoint) {
    return {
      online: false,
      lastSeen: Date.now(),
      source: { kind: 'unavailable', reason: 'No A2A endpoint in registration file' },
    };
  }
  return {
    online: true,
    lastSeen: Date.now(),
    source: { kind: 'studio_status', endpoint },
  };
}
