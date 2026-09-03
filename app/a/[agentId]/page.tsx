import Link from 'next/link';
import ActivateAgent from '../../../components/ActivateAgent';
import { getMockAgent } from '../../../lib/chain/mock';

export default async function AgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const agent = getMockAgent(agentId);
  if (!agent) {
    return (
      <main className="route-page">
        <div className="route-content">
          <h1>Agent not found</h1>
          <Link href="/">Return to marketplace</Link>
        </div>
      </main>
    );
  }
  return (
    <main className="route-page">
      <header className="route-head">
        <Link href="/">← Agent Atlas</Link>
        <span>{agent.source === 'live' ? 'LIVE' : 'MOCK DATA'}</span>
      </header>
      <div className="route-content">
        <div className="eyebrow muted">{agent.category.toUpperCase()}</div>
        <h1>{agent.identity.name}</h1>
        <div className="status">
          <span className={agent.status.online ? 'live-dot' : 'offline-dot'} />
          {agent.status.online ? 'ONLINE' : 'OFFLINE'}
        </div>
        <p>{agent.identity.description}</p>
        <section className="route-panel">
          <h3>ERC-8004 IDENTITY</h3>
          <code>{agent.identity.agentId}</code>
          <a href={`https://bscscan.com/address/${agent.identity.wallet}`} target="_blank" rel="noreferrer">
            Owner / wallet on BscScan ↗
          </a>
        </section>
        <section className="route-panel">
          <h3>REPUTATION</h3>
          <div className="route-metrics">
            <span>{agent.reputation.feedbackCount.value} feedback</span>
            <span>{agent.reputation.score.value.toFixed(1)} score</span>
            <span>{agent.reputation.validations.value} validations</span>
          </div>
        </section>
        <section className="route-panel">
          <h3>WHAT IT DOES</h3>
          <ul>{agent.capabilities.map((x) => <li key={x}>{x}</li>)}</ul>
          <h3>WHAT IT WON'T DO</h3>
          <ul>{agent.limits.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <ActivateAgent
          agentId={agent.identity.agentId}
          name={agent.identity.name}
          category={agent.category}
          online={agent.status.online}
          live={agent.source === 'live'}
        />
      </div>
    </main>
  );
}
