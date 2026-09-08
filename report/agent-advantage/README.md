# Agent Advantage Report

TermiX three-task record. **No fabricated numbers.** Incomplete steps stay **pending**. Job 963 is **SUBMITTED**, not settled (24h dispute window).

| Task | Domain | Live evidence | Status |
| --- | --- | --- | --- |
| [Task 1 — Grid trading](./task-1-grid-trading/) | Trading | ERC-8183 job `963` `SUBMITTED` + [deliverable](https://bnbagent-api.bnbchain.world/v1/deliverables/sha256/7a5646139eefd148676d12a1e59c9f9e02a4c378cb9f235b74ede4808df251e5.json); seller now on AWS AgentCore | **Complete** |
| [Task 2 — Health factor](./task-2-health-factor/) | Security / DeFi | Seller **live** ERC-8004 `2208`. ERC-8183 job `1120` **FUNDED** (0.1 U escrow). No `deliverable_url` — Pieverse `auto/free` 429 | Partial (funded, not SUBMITTED) |
| [Task 3 — Stablecoin yield](./task-3-yield/) | DeFi | 2026-09-04 public APY snapshot; seller **live** ERC-8004 `2209`. ERC-8183 job `1121` **FUNDED**. No deliverable — same 429 | Partial (funded, not SUBMITTED) |

## Live sellers (AWS AgentCore, 2026-09-07)

All four run in account `850122838544` / `us-east-1`. Marketplace listings: four **live** + seven **demo**. Do not treat demo rows (`venus-guardian`, `stable-router`, …) as deployed.

| Marketplace ID | ERC-8004 | Wallet | Runtime ARN | ERC-8183 |
| --- | --- | --- | --- | --- |
| `grid-bnb-usdt` | `2066` | `0x3573e861363880f18F357Ca8258FA1393573d676` | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/gridbnbusdt-bohsdVE5Pv` | job `963` **SUBMITTED** |
| `rebalancing-pcs-v3` | `2207` | `0x48566287e8afDE4Eb7550f44f778E4C1a3B2EC32` | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/rebalancingpcsv3-P5Q200A9kZ` | job `1115` **FUNDED** |
| `hf-guard-venus` | `2208` | `0xaaBd845B763761af98eE516a2a08829AEf548Cf3` | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/hfguardvenus-sG614z4iLZ` | job `1120` **FUNDED** |
| `yield-stable-router` | `2209` | `0xec2edaf39738Fd92B095dD1c8d10B39074f1B0bE` | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/yieldstablerouter-FscO4qDKDv` | job `1121` **FUNDED** |

Task 1 used `grid-bnb-usdt` for the verified hire (job `963` SUBMITTED). On-chain FUNDED jobs (buyer `0x81122d2Ea08B5c61b899949fc9b9C3735C972414`): `rebalancing-pcs-v3` job `1115`, `hf-guard-venus` job `1120`, `yield-stable-router` job `1121`. Background delivery failed with Pieverse `auto/free` **429 Daily request limit exceeded**; `deliverable_url` is still null. Demo rows (`venus-guardian`, `stable-router`, …) stay demo.
