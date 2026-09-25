'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import ConnectButton from '../../components/ConnectButton';
import RevokeAllowance from '../../components/RevokeAllowance';

type HireRow = {
  jobId: string;
  provider?: string;
  txHash?: string;
  fundedInWindow?: boolean;
};

export default function MePage() {
  const { address, isConnected } = useAccount();
  const [hires, setHires] = useState<HireRow[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!address) {
      setHires([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/hires?wallet=${address}`)
      .then(async (res) => {
        const body = await res.json() as { hires?: HireRow[]; error?: string; logWindowNote?: string };
        if (cancelled) return;
        setHires(body.hires ?? []);
        setNote(body.error || body.logWindowNote || '');
      })
      .catch((err) => {
        if (!cancelled) setNote(err instanceof Error ? err.message : 'HIRE_LOGS_FAILED');
      });
    return () => { cancelled = true; };
  }, [address]);

  return (
    <main className="route-page">
      <header className="route-head">
        <Link href="/">← Agent Atlas</Link>
        <span>MY AGENTS · CHAIN 97</span>
      </header>
      <div className="route-content">
        <div className="eyebrow muted">YOUR COMMAND CENTER</div>
        <h1>My agents.</h1>
        <p>Hires are ERC-8183 jobs created by this wallet. Allowance revoke sets $U approve(commerce, 0).</p>
        <div className="wallet-box" style={{ marginTop: 18 }}>
          <ConnectButton />
        </div>
        <RevokeAllowance />
        {!isConnected && (
          <div className="empty route-empty">
            <div>✦</div>
            <p>Connect the buyer wallet to list on-chain hires.</p>
            <Link className="primary" href="/">Browse marketplace ↗</Link>
          </div>
        )}
        {isConnected && hires.length === 0 && (
          <div className="empty route-empty">
            <div>✦</div>
            <p>No JobCreated events in the RPC log window for this wallet.</p>
            <span>{note}</span>
            <Link className="primary" href="/">Browse marketplace ↗</Link>
          </div>
        )}
        {hires.length > 0 && (
          <section className="route-panel">
            <h3>ERC-8183 HIRES</h3>
            {hires.map((hire) => (
              <code key={hire.jobId}>
                job {hire.jobId} · provider {hire.provider} · {hire.fundedInWindow ? 'FUNDED in window' : 'not funded in window'} · {hire.txHash}
              </code>
            ))}
            {note && <p className="fine">{note}</p>}
          </section>
        )}
      </div>
    </main>
  );
}
