import { getMockAgent, getMockAgents } from './mock';
import { cached } from './cache';
import { getRegistryAddresses } from './addresses';
import { identityRegistryAbi, reputationRegistryAbi } from './abi/erc8004';
import { publicClient } from './client';

const useMock = () => process.env.MOCK_DATA !== 'false';
function requireLiveConfig() {
  const addresses = getRegistryAddresses();
  if (!identityRegistryAbi.length || !reputationRegistryAbi.length) throw new Error('ERC8004_ABI_CONFIRMATION_REQUIRED');
  return addresses;
}

export async function getAgentIdentity(agentId: string) {
  if (useMock()) return getMockAgent(agentId)?.identity ?? null;
  return cached(`identity:${agentId}`, async () => {
    requireLiveConfig();
    throw new Error('ERC8004_IDENTITY_READ_NOT_IMPLEMENTED_UNTIL_OFFICIAL_ABI_IS_CONFIRMED');
  });
}
export async function getAgentReputation(agentId: string) {
  if (useMock()) return getMockAgent(agentId)?.reputation ?? null;
  return cached(`reputation:${agentId}`, async () => {
    requireLiveConfig();
    throw new Error('ERC8004_REPUTATION_READ_NOT_IMPLEMENTED_UNTIL_OFFICIAL_ABI_IS_CONFIRMED');
  });
}
export async function getRegisteredAgentCount() {
  if (useMock()) return getMockAgents().length;
  return cached('registered-count', async () => {
    const { identity } = requireLiveConfig();
    if (!identity || !publicClient) throw new Error('ERC8004_IDENTITY_REGISTRY_REQUIRED');
    throw new Error('ERC8004_COUNT_READ_NOT_IMPLEMENTED_UNTIL_OFFICIAL_ABI_IS_CONFIRMED');
  });
}
export async function listAgentsByIds(ids?: string[]) {
  const all = getMockAgents();
  if (useMock()) return ids?.length ? all.filter(a => ids.includes(a.identity.agentId)) : all;
  return all.filter(a => a.source === 'live' && (!ids?.length || ids.includes(a.identity.agentId)));
}
