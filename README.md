# Agent Atlas

**Status: Live agent deployed + ERC-8183 buyer flow implemented; end-to-end hire pending final verification.**

**Find, compare and hire DeFi agents on BNB Smart Chain.**

Agent Atlas is a marketplace for ERC-8004 agents on BNB Smart Chain, built for the BNB Chain **Build the Era** hackathon (Main Track + TermiX Challenge). Users browse four equal categories, inspect the data behind each metric, compare agents, and activate a live agent with a capital cap via ERC-8183.

- **Repository:** [github.com/bluescorpio/agent-atlas](https://github.com/bluescorpio/agent-atlas)
- **Local demo:** `http://127.0.0.1:3000`
- **Agent Advantage Report:** [`report/agent-advantage/`](./report/agent-advantage/) — Task 1 has a raw negotiate transcript; the full three-task comparison is not yet claimed.

> **Live + demo mix.** One Agent Studio agent (`grid-bnb-usdt`) is deployed on BSC testnet and hireable through the ERC-8183 path. The other seven marketplace listings remain labelled **Demo — not deployed**.

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
5. Activate a **live** listing: connect wallet → set `gridCount` / `lowerPrice` / `upperPrice` / `budgetCap` → server runs ERC-8183 hire → show `job_id`, fund tx, `deliverable_url`.

Demo listings refuse activation with `DEMO_AGENT_NOT_ACTIVATABLE`. The marketplace is designed for five clicks or fewer on the hire path.

## Live deployment

| Field | Value |
| --- | --- |
| **Agent** | Grid BNB / USDT (`grid-bnb-usdt`) |
| **ERC-8004 agent_id** | `2066` |
| **Wallet** | [`0x3573e861363880f18F357Ca8258FA1393573d676`](https://bscscan.com/address/0x3573e861363880f18F357Ca8258FA1393573d676) |
| **BscScan** | https://bscscan.com/address/0x3573e861363880f18F357Ca8258FA1393573d676 |
| **Endpoint / agent card** | https://bnbagent-api.bnbchain.world/v1/rt/01M1K4SSXB6VA50K5C6FV6E4JK/.well-known/agent-card.json |
| **A2A invoke** | https://bnbagent-api.bnbchain.world/v1/rt/01M1K4SSXB6VA50K5C6FV6E4JK/a2a |
| **Network** | BSC testnet (`chain_id=97`) |
| **Deployed** | 2026-09-03 (BNB Agent Studio trial / AWS AgentCore) |
| **Price** | `0.10 U` per task |

**ERC-8183 hire path (marketplace → seller):**

1. A2A `negotiate` (data part) → signed quote (`0.1 U`, 15 min TTL)
2. On-chain `createJob` → `registerJob` → `setBudget` → `fund`
3. A2A `notify_funded` with the real `job_id`
4. Poll commerce until `SUBMITTED`, read `deliverable_url`

Server entry: [`app/api/activate/route.ts`](./app/api/activate/route.ts) → [`lib/x402/activate.ts`](./lib/x402/activate.ts) → [`lib/erc8183/`](./lib/erc8183/).

## Screenshots

Screenshots will be stored under [`docs/screenshots/`](./docs/screenshots/) after the next visual QA pass. Until then, the local demo is the canonical preview.

| Rebalancing | Grid Trading |
| --- | --- |
| _Screenshot pending_ | _Screenshot pending_ |

| Yield Optimisation | Health Factor |
| --- | --- |
| _Screenshot pending_ | _Screenshot pending_ |

## Data sources

Every displayed metric is represented with a `DataSource` object. Demo listings are labelled Demo data; the live listing uses the Studio endpoint and on-chain ERC-8183 rail for hire.

- **ERC-8004 Identity Registry:** agent ID, owner, wallet, registration time.
- **ERC-8004 Reputation Registry:** feedback count, score, validations.
- **Onchain transaction history:** category metrics computed from the agent wallet's BSC transactions.
- **BNB Agent Studio:** online/offline status via the agent's ERC-8183 endpoint.

The adapter boundary is [`lib/chain/`](./lib/chain/). Registry entries are maintained in [`lib/registry.json`](./lib/registry.json). Registry addresses and ABIs are intentionally not guessed; configure them only after the official hackathon references are confirmed.

## Current marketplace manifest

One **live** listing plus seven **demo** listings. Manifest IDs are marketplace IDs; only `grid-bnb-usdt` has a recorded ERC-8004 `agent_id`.

| Agent | Category | Protocol | Manifest ID | Status |
| --- | --- | --- | --- | --- |
| Grid BNB / USDT | Grid Trading | PancakeSwap | `grid-bnb-usdt` | **Live** (ERC-8004 `2066`, BSC testnet) |
| Grid Alpha v2 | Grid Trading | Thena | `grid-alpha-v2` | Demo — not deployed |
| LP Range Keeper | Rebalancing | PancakeSwap v3 | `lp-range-keeper` | Demo — not deployed |
| Range Pilot | Rebalancing | PancakeSwap v3 | `range-pilot` | Demo — not deployed |
| Stable Router | Yield Optimisation | Venus / Lista | `stable-router` | Demo — not deployed |
| Yield Scout | Yield Optimisation | Lista | `yield-scout` | Demo — not deployed |
| Venus Guardian | Health Factor | Venus | `venus-guardian` | Demo — not deployed |
| HF Sentinel | Health Factor | Lista Lending | `hf-sentinel` | Demo — not deployed |

Agent Studio deployment slots live under [`agents/`](./agents/).

| Deployment slot | Category | Protocol | Status |
| --- | --- | --- | --- |
| `grid-bnb-usdt` | Grid Trading | PancakeSwap | **Live (trial)** |
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

Set `AGENT_CLIENT_ID` / `AGENT_CLIENT_SECRET` and `ERC8183_BUYER_PRIVATE_KEY` (BSC testnet buyer with ≥ 0.1 U + gas) to exercise the live hire path. With only `MOCK_DATA=true`, the UI still browses listings without paying. Production build:

```bash
npm run build
```

## Tech

Next.js 15 (App Router) · TypeScript · `viem` + `wagmi` · TanStack Query · BNB Agent Studio (`@bnbagent/studio-cli`) · `@bnbagent/sdk` ERC-8183 buyer · x402/B402 seam reserved · Vercel target

## Roadmap

- [x] UI prototype with four equal categories, cards, detail and activation flow.
- [x] Mock data adapter with eight listings and explicit source metadata.
- [x] Category, detail, compare and My agents route skeletons.
- [x] Deploy `grid-bnb-usdt` on BNB Agent Studio (BSC testnet trial); `hf-guard-venus` still Planned.
- [x] Marketplace ERC-8183 buyer path: negotiate → fund → notify_funded → poll `SUBMITTED`.
- [ ] End-to-end hire verification on BSC testnet (fund + deliverable receipt recorded in the report).
- [ ] Read ERC-8004 identity and reputation from BSC for live listings.
- [ ] Compute category metrics from onchain transaction history.
- [ ] x402 / B402 activation (credentials not ready; ERC-8183 is the live rail).
- [ ] Deploy `yield-stable-router` and `rebalancing-pcs-v3`.
- [ ] Capture the three-task Agent Advantage Report with raw transaction evidence (Task 1 negotiate raw only so far).

## Hackathon

- **Event:** BNB Chain — Build the Era (5 Aug – 9 Sep 2026)
- **Tracks:** Main Track · TermiX Challenge
- **Team:** `bluescorpio`

## License

MIT
