'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Wallet, X, Zap } from 'lucide-react';
import { useAccount } from 'wagmi';
import ConnectButton from './ConnectButton';
import type { Category } from '../lib/types';

type Props = {
  agentId: string;
  name: string;
  category: Category;
  online: boolean;
  live?: boolean;
};

type Result = {
  jobId?: string;
  txHash?: string;
  taskId?: string;
  deliverableUrl?: string;
  receipt?: { createTx?: string; registerTx?: string; setBudgetTx?: string; fundTx?: string };
  error?: string;
  nextStep?: string;
};

const DEFAULT_PARAMS = {
  gridCount: '10',
  lowerPrice: '500',
  upperPrice: '600',
  budgetCap: '0.1',
};

export default function ActivateAgent({ agentId, name, category, online, live = true }: Props) {
  const { address, isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [params, setParams] = useState<Record<string, string>>(DEFAULT_PARAMS);

  const canActivate = online && live;

  const openModal = () => {
    setError('');
    setResult(null);
    setBusy(false);
    setStep(isConnected ? 2 : 1);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    if (!isConnected && step > 1) setStep(1);
    if (isConnected && step === 1) setStep(2);
  }, [open, isConnected, step]);

  const setField = (key: string, value: string) => setParams((prev) => ({ ...prev, [key]: value }));

  function validateParams(): string | null {
    if (category !== 'grid_trading') return null;
    if (!params.gridCount || Number(params.gridCount) <= 0) return 'gridCount is required';
    if (!params.lowerPrice || !params.upperPrice) return 'lowerPrice and upperPrice are required';
    if (Number(params.lowerPrice) >= Number(params.upperPrice)) return 'lowerPrice must be below upperPrice';
    if (!params.budgetCap) return 'budgetCap is required';
    return null;
  }

  async function submit() {
    if (!address) {
      setStep(1);
      setError('Connect a wallet before activating.');
      return;
    }
    const invalid = validateParams();
    if (invalid) {
      setError(invalid);
      setStep(2);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agentId, params, wallet: address }),
      });
      const body = await response.json() as Result;
      if (!response.ok) {
        setError(body.error || 'ACTIVATION_FAILED');
        return;
      }
      setResult(body);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ACTIVATION_FAILED');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="primary" type="button" onClick={openModal} disabled={!canActivate}>
        Activate {name} <Zap size={13} />
      </button>
      {open && (
        <div className="modal-backdrop">
          <div className="activate-modal">
            <div className="activate-head">
              <div>
                <div className="eyebrow muted">ACTIVATE AGENT</div>
                <h2>{name}</h2>
              </div>
              <button className="close" type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="steps">
              {['Connect wallet', 'Parameters', 'ERC-8183', 'Done'].map((label, i) => (
                <div className={step === i + 1 ? 'step active' : step > i + 1 ? 'step done' : 'step'} key={label}>
                  <span>{step > i + 1 ? '✓' : i + 1}</span>{label}
                </div>
              ))}
            </div>
            {step === 1 && (
              <div className="step-body">
                <div className="wallet-box">
                  <Wallet size={20} />
                  <div>
                    <strong>Connect your wallet</strong>
                    <p>Must be the ERC-8183 buyer on BSC testnet (chain 97) that holds ≥ 0.1 U plus gas. The server signs with ERC8183_BUYER_PRIVATE_KEY for that same address.</p>
                  </div>
                  <ConnectButton />
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="step-body">
                {category === 'grid_trading' ? (
                  <>
                    <label>gridCount <span>Required</span>
                      <div className="input-wrap">
                        <input placeholder="10" value={params.gridCount} onChange={(e) => setField('gridCount', e.target.value)} />
                        <b>levels</b>
                      </div>
                    </label>
                    <label>lowerPrice <span>Required</span>
                      <div className="input-wrap">
                        <input placeholder="500" value={params.lowerPrice} onChange={(e) => setField('lowerPrice', e.target.value)} />
                        <b>USDT</b>
                      </div>
                    </label>
                    <label>upperPrice <span>Required</span>
                      <div className="input-wrap">
                        <input placeholder="600" value={params.upperPrice} onChange={(e) => setField('upperPrice', e.target.value)} />
                        <b>USDT</b>
                      </div>
                    </label>
                    <label>budgetCap <span>Required</span>
                      <div className="input-wrap">
                        <input placeholder="0.1" value={params.budgetCap} onChange={(e) => setField('budgetCap', e.target.value)} />
                        <b>U</b>
                      </div>
                    </label>
                  </>
                ) : (
                  <label>budgetCap <span>Required</span>
                    <div className="input-wrap">
                      <input placeholder="0.1" value={params.budgetCap} onChange={(e) => setField('budgetCap', e.target.value)} />
                      <b>U</b>
                    </div>
                  </label>
                )}
                <button className="primary full" type="button" onClick={() => {
                  const invalid = validateParams();
                  if (invalid) { setError(invalid); return; }
                  setError('');
                  setStep(3);
                }}>
                  Continue to payment <ArrowUpRight size={15} />
                </button>
                {error && <p className="fine">{error}</p>}
              </div>
            )}
            {step === 3 && (
              <div className="step-body">
                <div className="pay-summary">
                  <span>ERC-8183 hire · 0.1 U · chain 97</span>
                  <strong>{agentId}</strong>
                  <span className="muted-text">negotiate → fund on-chain → notify_funded → poll SUBMITTED</span>
                  <small>
                    {params.gridCount} levels · {params.lowerPrice}–{params.upperPrice} USDT · cap {params.budgetCap} U
                  </small>
                </div>
                {error && <p className="fine">{error}</p>}
                <button className="primary full" type="button" onClick={submit} disabled={busy || !isConnected}>
                  {busy ? 'Hiring on-chain… this can take a few minutes' : 'Sign & pay 0.1 U'} <Wallet size={15} />
                </button>
                <p className="fine">OAuth stays on the server. Connected wallet must match ERC8183_BUYER_PRIVATE_KEY.</p>
              </div>
            )}
            {step === 4 && (
              <div className="step-body done-body">
                <div className="done-mark">✓</div>
                <h3>Agent is on duty.</h3>
                <p>{name} accepted the job and submitted on-chain.</p>
                <code>job_id {result?.jobId ?? result?.taskId}</code>
                {result?.txHash && <code>fund {result.txHash}</code>}
                {result?.deliverableUrl && (
                  <a href={result.deliverableUrl} target="_blank" rel="noreferrer">
                    <code>{result.deliverableUrl}</code>
                  </a>
                )}
                <button className="primary full" type="button" onClick={() => setOpen(false)}>
                  Close <ArrowUpRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
