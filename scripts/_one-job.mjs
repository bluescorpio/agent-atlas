import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
function load(path, allow) {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const eq = t.indexOf('=');
    const key = t.slice(0, eq).trim();
    if (allow && !allow.includes(key)) continue;
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (value) process.env[key] = value;
  }
}
load(resolve(process.cwd(), '.env.local'));
load(resolve(process.cwd(), 'agents/rebalancing-pcs-v3/.studio/.env.local'), ['ERC8183_BUYER_PRIVATE_KEY']);
const raw = process.env.ERC8183_BUYER_PRIVATE_KEY.trim();
const key = raw.startsWith('0x') ? raw : `0x${raw}`;
if (!process.env.RPC_URL) process.env.RPC_URL = process.env.BSC_TESTNET_RPC_URL;
const { ERC8183Client } = await import('@bnbagent/sdk/erc8183');
const { EVMWalletProvider } = await import('@bnbagent/sdk/wallets');
const wallet = new EVMWalletProvider({ password: 'atlas-ephemeral', privateKey: key, persist: false });
try {
  const client = await ERC8183Client.create({ walletProvider: wallet, network: 'bsc-testnet' });
  const names = { 0: 'OPEN', 1: 'FUNDED', 2: 'SUBMITTED', 3: 'COMPLETED', 4: 'REJECTED', 5: 'EXPIRED' };
  const id = BigInt(process.argv[2] || '1333');
  const status = await client.getJobStatus(id);
  console.log(JSON.stringify({ jobId: id.toString(), status, label: names[Number(status)] ?? String(status) }));
} finally {
  wallet.destroy?.();
}
