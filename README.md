# Agent Atlas

**Live URL:** [https://agent-atlas.xyz](https://agent-atlas.xyz) · canonical [https://www.agent-atlas.xyz](https://www.agent-atlas.xyz)

Checked 2026-09-25: apex TLS is Let's Encrypt `CN=agent-atlas.xyz` (not `*.vercel.app`). `curl -I https://agent-atlas.xyz` is **308** to `www`; `curl -I https://www.agent-atlas.xyz` is **200**. Listings and `GET /api/agents` are live ERC-8004 reads on chain 97.

**Status:** Marketplace listings are ERC-8004 tokenURI rows on BSC testnet (chain 97). Four AgentCore sellers are hireable (ids `2066` / `2207` / `2208` / `2209`). ERC-8183: job `963` **SUBMITTED** (grid). Jobs `1115` / `1120` / `1121` **FUNDED** — deliverables blocked by Pieverse `auto/free` 429.

**Find, compare and hire DeFi agents on BNB Smart Chain.**

Agent Atlas is a marketplace for ERC-8004 agents on BNB Smart Chain, built for the BNB Chain **Build the Era** hackathon (Main Track + TermiX Challenge). Users browse four equal categories plus Unclassified, inspect the data behind each metric, compare agents, and activate a hireable AgentCore seller with a real spend cap via ERC-8183.

- **Repository:** [github.com/bluescorpio/agent-atlas](https://github.com/bluescorpio/agent-atlas)
- **Local:** `http://127.0.0.1:3000`
- **Agent Advantage Report:** [`report/agent-advantage/`](./report/agent-advantage/) — three-task write-up; Task 1 hire **Complete** ([job 963](https://bnbagent-api.bnbchain.world/v1/deliverables/sha256/7a5646139eefd148676d12a1e59c9f9e02a4c378cb9f235b74ede4808df251e5.json) `SUBMITTED`). Tasks 2–3 have live sellers plus on-chain `FUNDED` jobs (`1120` / `1121`); deliverables are **not** generated yet (Pieverse `auto/free` daily 429).

## Network and contracts (BSC Testnet, chain 97)

| Role | Address |
| --- | --- |
| ERC-8004 Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| ERC-8183 Commerce | `0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de` |
| ERC-8183 Router | `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25` |
| ERC-8183 Policy | `0xd6a4217588f6b1f5657a92a3e94e6422ad771cea` |
| Payment token $U | `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` |

The home page prints Identity + Reputation + Commerce + $U. Each agent detail page prints registry address, `agent_id`, owner, wallet, registration tx (when the RPC log window includes it), and fetch freshness. Stale catalog / non-responding A2A is labelled, not hidden.

## Why this exists

There are hundreds of thousands of agents registered on BSC under ERC-8004, but users still need a simple way to find one, judge whether it is worth hiring, and put it to work. Agent Atlas is that front door: four categories treated equally, metrics with explicit sources, and a short path from discovery to activation.

## The four categories

| Category | What the agent does | Metrics shown on cards |
| --- | --- | --- |
| **Rebalancing** | Manages LP ranges and resets positions when price exits | In-range time, resets, TVL managed — omitted until computed from tx history |
| **Grid Trading** | Places and manages automated grid orders | Win rate, time window, max drawdown — omitted until computed from tx history |
| **Yield Optimisation** | Routes liquidity to the highest realised APR | Realised APR, migrations, AUM — omitted until computed from tx history |
| **Health Factor Monitoring** | Protects lending positions from liquidation | Positions guarded, liquidations prevented, response time — omitted until computed from tx history |

All four are first-class categories. There is no featured category. Registration files without a category (and without a known AgentCore runtime marker) are **Unclassified**.

**Coverage gap:** the hackathon asked for ≥3 hireable agents per category. Atlas currently maps **one** AgentCore seller per category (`2066` / `2207` / `2208` / `2209`). Additional sellers are not invented.

## Product flow

1. Pick a category on the home page.
2. Scan agent cards (registry id, category source, URI readability).
3. Select 2–4 agents and open [`/compare`](http://127.0.0.1:3000/compare).
4. Open an agent detail route such as [`/a/2066`](http://127.0.0.1:3000/a/2066).
5. Activate a **hireable** listing: connect wallet → set parameters including `budgetCap` → server runs ERC-8183 hire (quote above cap is rejected; `$U` approve is the exact quote, spender = commerce) → show `job_id`, fund tx, `deliverable_url`.
6. Revoke leftover `$U` allowance from `/me` or after a hire (`POST /api/revoke` → `approve(commerce, 0)`).

## Live AgentCore sellers

Four AWS AgentCore runtimes (account `850122838544`, region `us-east-1`). Hire rail is ERC-8183 on BSC testnet (`chain_id=97`). Quoted price: `0.10 U` per task.

| Agent | ERC-8004 | Wallet | AgentCore runtime ARN |
| --- | --- | --- | --- |
| Grid BNB / USDT (`grid-bnb-usdt`) | `2066` | [`0x3573e861363880f18F357Ca8258FA1393573d676`](https://testnet.bscscan.com/address/0x3573e861363880f18F357Ca8258FA1393573d676) | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/gridbnbusdt-bohsdVE5Pv` |
| Rebalancing PCS v3 (`rebalancing-pcs-v3`) | `2207` | [`0x48566287e8afDE4Eb7550f44f778E4C1a3B2EC32`](https://testnet.bscscan.com/address/0x48566287e8afDE4Eb7550f44f778E4C1a3B2EC32) | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/rebalancingpcsv3-P5Q200A9kZ` |
| HF Guard Venus (`hf-guard-venus`) | `2208` | [`0xaaBd845B763761af98eE516a2a08829AEf548Cf3`](https://testnet.bscscan.com/address/0xaaBd845B763761af98eE516a2a08829AEf548Cf3) | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/hfguardvenus-sG614z4iLZ` |
| Yield Stable Router (`yield-stable-router`) | `2209` | [`0xec2edaf39738Fd92B095dD1c8d10B39074f1B0bE`](https://testnet.bscscan.com/address/0xec2edaf39738Fd92B095dD1c8d10B39074f1B0bE) | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/yieldstablerouter-FscO4qDKDv` |

[`lib/registry.json`](./lib/registry.json) is an overlay for those four rows only (capabilities / limits / marketplace id). It does **not** seed the marketplace list.

### ERC-8183 hire status (BSC testnet, buyer `0x81122d2Ea08B5c61b899949fc9b9C3735C972414`)

| Agent | job_id | Chain status | Deliverable |
| --- | --- | --- | --- |
| `grid-bnb-usdt` | `963` | **SUBMITTED** | [sha256/7a5646…51e5.json](https://bnbagent-api.bnbchain.world/v1/deliverables/sha256/7a5646139eefd148676d12a1e59c9f9e02a4c378cb9f235b74ede4808df251e5.json) |
| `rebalancing-pcs-v3` | `1115` | **FUNDED** (0.1 U in escrow) | none yet |
| `hf-guard-venus` | `1120` | **FUNDED** (0.1 U in escrow) | none yet |
| `yield-stable-router` | `1121` | **FUNDED** (0.1 U in escrow) | none yet |

Jobs `1115` / `1120` / `1121` completed negotiate → createJob → registerJob → setBudget → fund → `notify_funded` accepted. Background delivery then failed: Pieverse `auto/free` returned **429 Daily request limit exceeded**. Deliverables will be submitted after that quota resets (or after a paid model + redeploy). Do not treat FUNDED as SUBMITTED.

| Field | Grid hire evidence |
| --- | --- |
| **Verified hire** | job `963` — **SUBMITTED** (not settled; 24h dispute window) |
| **Deliverable** | [sha256/7a5646…51e5.json](https://bnbagent-api.bnbchain.world/v1/deliverables/sha256/7a5646139eefd148676d12a1e59c9f9e02a4c378cb9f235b74ede4808df251e5.json) |
| **Grid first deployed** | 2026-09-03 (BNB Agent Studio trial); re-registered on AWS AgentCore 2026-09-07 |

## Verification evidence

- Activate API: `200` with `{ jobId: 963, status: SUBMITTED, deliverableUrl: ... }`
- Deliverable: 10-level BNB/USDT grid, 500–600 USDT, step ≈11.11, 0.166 BNB/level

![deliverable](docs/screenshots/04-deliverable.png)

**ERC-8183 hire path (marketplace → seller):**

1. A2A `negotiate` (data part) → signed quote (`0.1 U`, 15 min TTL)
2. Spend cap check: `quotedPriceWei > budgetCap` → `SPEND_CAP_EXCEEDED` (no chain writes)
3. On-chain `createJob` → `registerJob` → `setBudget` → `fund` with `approveFloor = quote` (spender = commerce). SDK default 100-token floor is not used.
4. A2A `notify_funded` with the real `job_id`
5. Poll commerce until `SUBMITTED`, read `deliverable_url`
6. Optional leftover revoke: `approve(commerce, 0)` via `POST /api/revoke`

Server entry: [`app/api/activate/route.ts`](./app/api/activate/route.ts) → [`lib/x402/activate.ts`](./lib/x402/activate.ts) → [`lib/erc8183/`](./lib/erc8183/).

End-to-end hire on the **deployed** preview still needs the four Cognito secrets on Vercel (`GRID_A2A_CLIENT_SECRET`, `REBALANCING_A2A_CLIENT_SECRET`, `HF_A2A_CLIENT_SECRET`, `YIELD_A2A_CLIENT_SECRET`). Missing secrets return HTTP 500 `A2A_OAUTH_CONFIG`. Do not set `AGENT_CLIENT_SECRET` (bnbagent-api `iss` is rejected by AgentCore).

## Tracking APIs

| Endpoint | What it returns |
| --- | --- |
| `GET /api/agents` | ERC-8004 catalog (identity registry address, `agent_id`, category, hireable, stale flag) |
| `GET /api/hires?wallet=0x…` | ERC-8183 `JobCreated` / `JobFunded` logs for that client (RPC range capped) |
| `GET /api/agents/by-owner?owner=0x…` | Identity tokens owned by that address |
| `GET /api/revoke?wallet=0x…` | Current `$U` allowance to commerce |
| `POST /api/revoke` | `approve(commerce, 0)` for the buyer key |

## Screenshots

| Rebalancing / home | Grid / detail |
| --- | --- |
| ![home](docs/screenshots/01-home.png) | ![detail](docs/screenshots/02-agent-detail.png) |

| Yield Optimisation | Health Factor |
| --- | --- |
| _Screenshot pending_ | _Screenshot pending_ |

`01-home` recaptured 2026-09-25 from `https://www.agent-atlas.xyz` (ERC-8004 catalog, chain 97, Identity/Reputation printed). `02-agent-detail` may still show an earlier card layout.

## Data sources

Every displayed metric is a `DataSource`. Card performance (win rate / APR / TVL) is **omitted** until computed from tx history — not filled with demo numbers.

- **ERC-8004 Identity Registry:** agent ID, owner, wallet, registration URI / time, registration tx when the log window includes it.
- **ERC-8004 Reputation Registry:** feedback count, score, validations (fail closed as `unavailable` if the read fails).
- **BNB Agent Studio / AgentCore:** hireable iff the registration URI maps to a known Cognito A2A client.
- **ERC-8183 Commerce:** hire, fund, submit, `$U` allowance.

The adapter boundary is [`lib/chain/`](./lib/chain/). Official Identity / Reputation ABIs live in [`lib/chain/abi/`](./lib/chain/abi/).

## Seller slots

Agent Studio deployment slots live under [`agents/`](./agents/).

| Deployment slot | Category | Protocol | Status |
| --- | --- | --- | --- |
| `grid-bnb-usdt` | Grid Trading | PancakeSwap | **Live** — ERC-8004 `2066`, AgentCore `gridbnbusdt-bohsdVE5Pv` |
| `rebalancing-pcs-v3` | Rebalancing | PancakeSwap v3 | **Live** — ERC-8004 `2207`, AgentCore `rebalancingpcsv3-P5Q200A9kZ` |
| `hf-guard-venus` | Health Factor Monitoring | Venus | **Live** — ERC-8004 `2208`, AgentCore `hfguardvenus-sG614z4iLZ` |
| `yield-stable-router` | Yield Optimisation | Venus / Lista | **Live** — ERC-8004 `2209`, AgentCore `yieldstablerouter-FscO4qDKDv` |

## Run locally

```bash
git clone https://github.com/bluescorpio/agent-atlas
cd agent-atlas
npm install
cp .env.example .env.local
npm run dev
```

Set `GRID_A2A_CLIENT_SECRET` / `REBALANCING_A2A_CLIENT_SECRET` / `HF_A2A_CLIENT_SECRET` / `YIELD_A2A_CLIENT_SECRET` (Cognito app client secrets) and `ERC8183_BUYER_PRIVATE_KEY` (BSC testnet buyer with ≥ 0.1 U + gas) to exercise the live hire path. Missing Cognito secrets return HTTP 500 with `A2A_OAUTH_CONFIG`. Do not reuse `AGENT_CLIENT_SECRET` from bnbagent-api — AgentCore JWT `iss` will not match. The catalog loads from chain 97 without those secrets.

```bash
npm run build
npm run test:erc8183
```

## Tech

Next.js 15 (App Router) · TypeScript · `viem` + `wagmi` · TanStack Query · BNB Agent Studio (`@bnbagent/studio-cli`) · `@bnbagent/sdk` ERC-8183 buyer · x402/B402 seam reserved · Vercel target

## Roadmap

- [x] UI prototype with four equal categories, cards, detail and activation flow.
- [x] Category, detail, compare and My agents routes.
- [x] Deploy four sellers on AWS AgentCore: `grid-bnb-usdt` (`2066`), `rebalancing-pcs-v3` (`2207`), `hf-guard-venus` (`2208`), `yield-stable-router` (`2209`).
- [x] Marketplace ERC-8183 buyer path: negotiate → fund → notify_funded → poll `SUBMITTED`.
- [x] End-to-end hire verification on BSC testnet: job `963` `SUBMITTED` on `grid-bnb-usdt`. Jobs `1115` / `1120` / `1121` `FUNDED` (0.1 U each); Pieverse `auto/free` 429 blocked deliverables.
- [x] Read ERC-8004 identity (and reputation when the RPC answers) from BSC testnet. No mock agent list.
- [x] Tracking APIs: `/api/agents`, `/api/hires`, `/api/agents/by-owner`.
- [x] Exact `$U` approve, spend cap enforced against the quote, revoke commerce allowance.
- [x] Custom domain `agent-atlas.xyz` on Vercel (apex 308 → `www` 200; Let's Encrypt).
- [ ] ≥3 hireable AgentCore sellers per category.
- [ ] Vercel Cognito secrets + a fresh SUBMITTED hire from the deployed site.
- [ ] Compute category metrics from onchain transaction history.
- [ ] x402 / B402 activation (credentials not ready; ERC-8183 is the live rail).
- [x] Capture the three-task Agent Advantage Report (Task 1 Complete / job 963; Tasks 2–3 live + FUNDED jobs `1120` / `1121`, deliverables blocked by Pieverse 429).

## Hackathon

- **Event:** BNB Chain — Build the Era (5 Aug – 9 Sep 2026)
- **Tracks:** Main Track · TermiX Challenge
- **Team:** `bluescorpio`

X, Telegram, team wallet, and brand-kit files are not invented here.

## License

MIT
