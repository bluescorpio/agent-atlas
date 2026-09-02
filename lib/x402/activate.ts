import type { AgentListing } from '../types';
export async function activate(agent:AgentListing, params:Record<string,string>, wallet:string){ if(!wallet) throw new Error('WALLET_NOT_CONNECTED'); if(!agent.status.online) throw new Error('AGENT_OFFLINE'); return {taskId:`demo_task_${agent.identity.agentId}_${Date.now()}`,receipt:{status:'demo-paid',agent:agent.identity.agentId,params}}; }
