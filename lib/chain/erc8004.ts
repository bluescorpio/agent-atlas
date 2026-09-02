import { getMockAgent, getMockAgents } from './mock';
export async function listAgentsByIds(ids?: string[]){ const all=getMockAgents(); return ids?.length ? all.filter(a=>ids.includes(a.identity.agentId)) : all; }
export async function getAgentIdentity(agentId:string){ return getMockAgent(agentId)?.identity ?? null; }
export async function getAgentReputation(agentId:string){ return getMockAgent(agentId)?.reputation ?? null; }
export async function getRegisteredAgentCount(){ return 200000; }
