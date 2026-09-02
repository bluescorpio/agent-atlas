export async function getAgentStatus(endpoint?:string){ return {online:Boolean(endpoint),lastSeen:Date.now(),source:{kind:'demo' as const}}; }
