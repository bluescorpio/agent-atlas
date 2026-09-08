import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv(path: string, override = false, allow?: string[]) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const eq = trimmed.indexOf('=');
      const key = trimmed.slice(0, eq).trim();
      if (allow && !allow.includes(key)) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (!value) continue;
      if (process.env[key] === undefined || override) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

const root = process.cwd();
loadDotEnv(resolve(root, '.env.local'));
loadDotEnv(resolve(root, 'agents/rebalancing-pcs-v3/.studio/.env.local'), true, ['ERC8183_BUYER_PRIVATE_KEY']);

async function main() {
  const jobId = BigInt(process.argv[2] || '1115');
  const raw = process.env.ERC8183_BUYER_PRIVATE_KEY?.trim();
  if (!raw) throw new Error('ERC8183_BUYER_PRIVATE_KEY_REQUIRED');
  if (!process.env.RPC_URL) process.env.RPC_URL = process.env.BSC_TESTNET_RPC_URL;
  const { ERC8183Client } = await import('@bnbagent/sdk/erc8183');
  const { EVMWalletProvider } = await import('@bnbagent/sdk/wallets');
  const wallet = new EVMWalletProvider({
    password: 'atlas-ephemeral',
    privateKey: raw.startsWith('0x') ? raw : `0x${raw}`,
    persist: false,
  });
  try {
    const client = await ERC8183Client.create({ walletProvider: wallet, network: 'bsc-testnet' });
    const status = await client.getJobStatus(jobId);
    console.log(JSON.stringify({ jobId: jobId.toString(), status, statusType: typeof status }, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    try {
      const url = await client.getDeliverableUrl(jobId);
      console.log(JSON.stringify({ deliverable_url: url }, null, 2));
    } catch (error) {
      console.log(JSON.stringify({ deliverable_url_error: error instanceof Error ? error.message : String(error) }, null, 2));
    }
  } finally {
    wallet.destroy?.();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
