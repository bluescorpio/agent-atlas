# Agent Atlas

**Status: Early prototype — onchain data and payment are mocked**

**Find, compare and hire DeFi agents on BNB Smart Chain.**

Agent Atlas is a marketplace prototype for ERC-8004 agents on BNB Smart Chain, built for the BNB Chain **Build the Era** hackathon (Main Track + TermiX Challenge). Users browse four equal categories, inspect the data behind each metric, compare agents, and activate one with a capital cap.

- **Repository:** [github.com/bluescorpio/agent-atlas](https://github.com/bluescorpio/agent-atlas)
- **Local demo:** `http://127.0.0.1:3000`
- **Agent Advantage Report:** [`report/agent-advantage/`](./report/agent-advantage/)

> **Status: Work in progress.** The current UI runs on labelled demo data (`MOCK_DATA=true`). No production Agent Studio deployment or live ERC-8004 registry address is claimed yet.

## Why this exists

There are hundreds of thousands of agents registered on BSC under ERC-8004, but users still need a simple way to find one, judge whether it is worth hiring, and put it to work. Agent Atlas is that front door: four categories treated equally, metrics with explicit sources, and a short path from discovery to activation.

## The four categories

| Category | What the agent does | Metrics shown on cards |
| --- | --- | --- |
| **Rebalancing** | Manages LP ranges and resets positions when price exits | In-range time, resets, TVL managed |
| **Grid Trading** | Places and manages automated grid orders | Win rate, time window, max drawdown |
| **Yield Optimisation** | Routes liquidity to the highest realised APR | Realised APR, migrations, AUM |
| **Health Factor Monitoring** | Protects lending positions from liquidation | Positions guarded, liquidations prevented, response time |

All four are first-class categories. There is no featured category.

## Product flow

1. Pick a category on the home page.
2. Scan agent cards and hover a metric to see its source.
3. Select 2–4 agents and open [`/compare`](http://127.0.0.1:3000/compare).
4. Open an agent detail route such as [`/a/grid-bnb-usdt`](http://127.0.0.1:3000/a/grid-bnb-usdt).
5. Activate: connect wallet → set category-specific parameters and a capital cap → pay via x402 → done.

The prototype is designed for five clicks or fewer. The current wallet and payment steps are mock seams, not claims of completed blockchain transactions.

## Screenshots

Screenshots will be stored under [`docs/screenshots/`](./docs/screenshots/) after the next visual QA pass. Until then, the local demo is the canonical preview.

| Rebalancing | Grid Trading |
| --- | --- |
| _Screenshot pending_ | _Screenshot pending_ |

| Yield Optimisation | Health Factor |
| --- | --- |
| _Screenshot pending_ | _Screenshot pending_ |

## Data sources

Every displayed metric is represented with a `DataSource` object. In mock mode the UI visibly labels these values as Demo data.

- **ERC-8004 Identity Registry:** agent ID, owner, wallet, registration time.
- **ERC-8004 Reputation Registry:** feedback count, score, validations.
- **Onchain transaction history:** category metrics computed from the agent wallet's BSC transactions.
- **BNB Agent Studio:** online/offline status via the agent's ERC-8183 endpoint.

The adapter boundary is [`lib/chain/`](./lib/chain/). Registry entries are maintained in [`lib/registry.json`](./lib/registry.json). Registry addresses and ABIs are intentionally not guessed; configure them only after the official hackathon references are confirmed.

## Current demo manifest

The eight entries below are fixed demo listings, not deployed production agents. Their IDs are marketplace manifest IDs until real ERC-8004 IDs are recorded.

| Agent | Category | Protocol | Manifest ID |
| --- | --- | --- | --- |
| Grid BNB / USDT | Grid Trading | PancakeSwap | `grid-bnb-usdt` |
| Grid Alpha v2 | Grid Trading | Thena | `grid-alpha-v2` |
| LP Range Keeper | Rebalancing | PancakeSwap v3 | `lp-range-keeper` |
| Range Pilot | Rebalancing | PancakeSwap v3 | `range-pilot` |
| Stable Router | Yield Optimisation | Venus / Lista | `stable-router` |
| Yield Scout | Yield Optimisation | Lista | `yield-scout` |
| Venus Guardian | Health Factor | Venus | `venus-guardian` |
| HF Sentinel | Health Factor | Lista Lending | `hf-sentinel` |

Agent Studio deployment slots are reserved under [`agents/`](./agents/). Real agent IDs, wallets, endpoints, and BscScan links will be added only after deployment.

| Deployment slot | Category | Protocol | Status |
| --- | --- | --- | --- |
| `grid-bnb-usdt` | Grid Trading | PancakeSwap | Planned |
| `hf-guard-venus` | Health Factor Monitoring | Venus | Planned |
| `yield-stable-router` | Yield Optimisation | Venus / Lista | Planned |
| `rebalancing-pcs-v3` | Rebalancing | PancakeSwap v3 | Planned |

## Run locally

```bash
git clone https://github.com/bluescorpio/agent-atlas
cd agent-atlas
npm install
cp .env.example .env.local
npm run dev
```

With `MOCK_DATA=true` (the default in `.env.example`) the site runs without RPC or wallet credentials. Production build:

```bash
npm run build
```

## Tech

Next.js 15 (App Router) · TypeScript · `viem` + `wagmi` · TanStack Query · BNB Agent Studio (`@bnbagent/studio-cli`) · x402 payments · Vercel target

## Roadmap

- [x] UI prototype with four equal categories, cards, detail and activation flow.
- [x] Mock data adapter with eight listings and explicit source metadata.
- [x] Category, detail, compare and My agents route skeletons.
- [ ] Deploy `grid-bnb-usdt` and `hf-guard-venus` on BNB Agent Studio.
- [ ] Read ERC-8004 identity and reputation from BSC.
- [ ] Compute category metrics from onchain transaction history.
- [ ] Connect wallet and complete real x402 activation.
- [ ] Deploy `yield-stable-router` and `rebalancing-pcs-v3`.
- [ ] Capture the three-task Agent Advantage Report with raw transaction evidence.

## Hackathon

- **Event:** BNB Chain — Build the Era (5 Aug – 9 Sep 2026)
- **Tracks:** Main Track · TermiX Challenge
- **Team:** `bluescorpio`

## License

MIT
