'use client';
import { Wallet } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
export default function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  if (isConnected && address) return <button className="connect" onClick={() => disconnect()}><Wallet size={14}/> {address.slice(0, 6)}...{address.slice(-4)}</button>;
  return <button className="connect" onClick={() => connectors[0] && connect({ connector: connectors[0] })}><Wallet size={14}/> Connect wallet</button>;
}
