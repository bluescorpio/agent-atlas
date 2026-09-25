import Link from 'next/link';
import ActivateAgent from '../../../components/ActivateAgent';
import { getAgentListing } from '../../../lib/chain/erc8004';
import { IDENTITY_REGISTRY_TESTNET } from '../../../lib/chain/addresses';

export const dynamic = 'force-dynamic';

export default async function AgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const agent = await getAgentListing(agentId);
  if (!agent) {
    return (
      <main className="route-page">
        <div className="route-content">
          <h1>Agent not found</h1>
          <p>No ERC-8004 tokenURI row resolved for <code>{agentId}</code> on chain 97.</p>
          <Link href="/">Return to marketplace</Link>
        </div>
      </main>
    );
  }
  const freshness = agent.identity.freshness;
  const stale = freshness?.stale || !agent.status.responding;
  const explorer = `https://testnet.bscscan.com`;
  return (
    <main className="route-page">
      <header className="route-head">
        <Link href="/">← Agent Atlas</Link>
        <span>BSC TESTNET · 97</span>
      </header>
      <div className="route-content">
        <div className="eyebrow muted">{agent.category.toUpperCase()} · {agent.categorySource}</div>
        <h1>{agent.identity.name}</h1>
        <div className="status">
          <span className={agent.status.responding ? 'live-dot' : 'offline-dot'} />
          {agent.status.responding ? 'A2A ENDPOINT PRESENT' : 'agent not responding'}
          {stale ? ' · data stale' : ''}
        </div>
        <p>{agent.identity.description}</p>
        <section className="route-panel">
          <h3>ERC-8004 IDENTITY</h3>
          <code>chain_id {agent.identity.chainId ?? 97}</code>
          <code>registry {agent.identity.registry ?? IDENTITY_REGISTRY_TESTNET}</code>
          <code>agent_id {agent.identity.erc8004Id}</code>
          <code>owner {agent.identity.owner}</code>
          <code>wallet {agent.identity.wallet}</code>
          {agent.identity.registrationTx ? (
            <code>registration tx {agent.identity.registrationTx}</code>
          ) : (
            <code>registration tx unavailable (RPC log range)</code>
          )}
          {agent.identity.endpoint && <code>{agent.identity.endpoint}</code>}
          <p className="fine">
            fetched {freshness ? new Date(freshness.fetchedAt).toISOString() : 'n/a'}
            {stale ? ' · data stale' : ''}
          </p>
          <a href={`${explorer}/address/${agent.identity.wallet}`} target="_blank" rel="noreferrer">
            Wallet on BscScan testnet ↗
          </a>
        </section>
        <section className="route-panel">
          <h3>REPUTATION</h3>
          <div className="route-metrics">
            <span>{agent.reputation.feedbackCount.value} feedback ({agent.reputation.feedbackCount.source.kind})</span>
            <span>{agent.reputation.score.value} score</span>
          </div>
          {agent.reputation.feedbackCount.source.kind === 'unavailable' && (
            <p className="fine">Reputation read unavailable — not replaced with demo numbers.</p>
          )}
        </section>
        <section className="route-panel">
          <h3>WHAT IT DOES</h3>
          <ul>{(agent.capabilities.length ? agent.capabilities : ['Not listed in registration file']).map((x) => <li key={x}>{x}</li>)}</ul>
          <h3>WHAT IT WON&apos;T DO</h3>
          <ul>{agent.limits.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <ActivateAgent
          agentId={String(agent.identity.erc8004Id)}
          name={agent.identity.name}
          category={agent.category === 'unclassified' ? 'grid_trading' : agent.category}
          online={agent.status.responding}
          live={agent.hireable}
        />
      </div>
    </main>
  );
}
