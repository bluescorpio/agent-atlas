import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function load(path, allow) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const eq = t.indexOf('=');
      const key = t.slice(0, eq).trim();
      if (allow && !allow.includes(key)) continue;
      let value = t.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value) process.env[key] = value;
    }
  } catch { /* optional */ }
}

load(resolve(process.cwd(), '.env.local'));
load(resolve(process.cwd(), 'agents/rebalancing-pcs-v3/.studio/.env.local'), ['ERC8183_BUYER_PRIVATE_KEY']);
const raw = process.env.ERC8183_BUYER_PRIVATE_KEY?.trim();
if (!raw) throw new Error('no buyer key');
if (!process.env.RPC_URL) process.env.RPC_URL = process.env.BSC_TESTNET_RPC_URL;
const key = raw.startsWith('0x') ? raw : `0x${raw}`;

const { ERC8183Client } = await import('@bnbagent/sdk/erc8183');
const { EVMWalletProvider } = await import('@bnbagent/sdk/wallets');
const { privateKeyToAccount } = await import('viem/accounts');

const wallet = new EVMWalletProvider({ password: 'atlas-ephemeral', privateKey: key, persist: false });
try {
  const client = await ERC8183Client.create({ walletProvider: wallet, network: 'bsc-testnet' });
  const names = { 0: 'OPEN', 1: 'FUNDED', 2: 'SUBMITTED', 3: 'COMPLETED', 4: 'REJECTED', 5: 'EXPIRED' };
  const jobs = [];
  for (const id of [963n, 1115n, 1120n, 1121n, 1330n, 1331n, 1332n]) {
    const status = await client.getJobStatus(id);
    jobs.push({ jobId: id.toString(), status, label: names[Number(status)] ?? String(status) });
  }
  console.log(JSON.stringify({ jobs, buyer: privateKeyToAccount(key).address }, null, 2));
} finally {
  wallet.destroy?.();
}
