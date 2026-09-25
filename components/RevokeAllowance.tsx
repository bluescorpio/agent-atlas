'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ERC8183_COMMERCE, U_TOKEN } from '../lib/erc8183/constants';

type Snapshot = {
  allowanceWei?: string;
  previousAllowanceWei?: string;
  txHash?: string | null;
  skipped?: boolean;
  error?: string;
  nextStep?: string;
};

export default function RevokeAllowance() {
  const { address, isConnected } = useAccount();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!address) {
      setSnap(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/revoke?wallet=${address}`)
      .then(async (res) => {
        const body = await res.json() as Snapshot;
        if (!cancelled) setSnap(body);
      })
      .catch((err) => {
        if (!cancelled) setSnap({ error: err instanceof Error ? err.message : 'ALLOWANCE_READ_FAILED' });
      });
    return () => { cancelled = true; };
  }, [address]);

  async function revoke() {
    if (!address) return;
    setBusy(true);
    try {
      const response = await fetch('/api/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wallet: address }),
      });
      const body = await response.json() as Snapshot;
      setSnap(body);
    } catch (err) {
      setSnap({ error: err instanceof Error ? err.message : 'REVOKE_FAILED' });
    } finally {
      setBusy(false);
    }
  }

  if (!isConnected || !address) {
    return (
      <p className="fine">Connect the ERC-8183 buyer wallet to read or revoke $U allowance to commerce.</p>
    );
  }

  return (
    <div className="route-panel">
      <h3>ERC-8183 $U ALLOWANCE</h3>
      <code>token {U_TOKEN}</code>
      <code>spender (commerce) {ERC8183_COMMERCE}</code>
      <code>owner {address}</code>
      <code>allowance {snap?.allowanceWei ?? snap?.previousAllowanceWei ?? '…'} wei</code>
      {snap?.txHash && <code>revoke tx {snap.txHash}</code>}
      {snap?.skipped && <p className="fine">Already zero — no approve(0) sent.</p>}
      {snap?.error && <p className="fine">{snap.error}{snap.nextStep ? ` · ${snap.nextStep}` : ''}</p>}
      <button className="ghost" type="button" onClick={revoke} disabled={busy}>
        {busy ? 'Revoking…' : 'Revoke commerce allowance'}
      </button>
    </div>
  );
}
