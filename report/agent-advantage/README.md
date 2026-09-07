# Agent Advantage Report

TermiX three-task record. **No fabricated numbers.** Incomplete steps stay **pending**. Job 963 is **SUBMITTED**, not settled (24h dispute window).

| Task | Domain | Live evidence | Status |
| --- | --- | --- | --- |
| [Task 1 — Grid trading](./task-1-grid-trading/) | Trading | ERC-8183 job `963` `SUBMITTED` + [deliverable](https://bnbagent-api.bnbchain.world/v1/deliverables/sha256/7a5646139eefd148676d12a1e59c9f9e02a4c378cb9f235b74ede4808df251e5.json); seller now on AWS AgentCore | **Complete** |
| [Task 2 — Health factor](./task-2-health-factor/) | Security / DeFi | Venus vUSDT params + local smoke; seller **live** ERC-8004 `2208` on AgentCore. **No ERC-8183 hire `job_id` yet** | Partial (deployed, hire not verified) |
| [Task 3 — Stablecoin yield](./task-3-yield/) | DeFi | Venus + DefiLlama USDT APYs fetched 2026-09-04; seller **live** ERC-8004 `2209` on AgentCore. Public-data check, not a paid hire | Complete as a public-data check |

## Live sellers (AWS AgentCore, 2026-09-07)

All four run in account `850122838544` / `us-east-1`. Marketplace listings: four **live** + seven **demo**. Do not treat demo rows (`venus-guardian`, `stable-router`, …) as deployed.

| Marketplace ID | ERC-8004 | Wallet | Runtime ARN |
| --- | --- | --- | --- |
| `grid-bnb-usdt` | `2066` | `0x3573e861363880f18F357Ca8258FA1393573d676` | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/gridbnbusdt-bohsdVE5Pv` |
| `rebalancing-pcs-v3` | `2207` | `0x48566287e8afDE4Eb7550f44f778E4C1a3B2EC32` | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/rebalancingpcsv3-P5Q200A9kZ` |
| `hf-guard-venus` | `2208` | `0xaaBd845B763761af98eE516a2a08829AEf548Cf3` | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/hfguardvenus-sG614z4iLZ` |
| `yield-stable-router` | `2209` | `0xec2edaf39738Fd92B095dD1c8d10B39074f1B0bE` | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/yieldstablerouter-FscO4qDKDv` |

Task 1 used `grid-bnb-usdt` for the verified hire. Task 2's dedicated seller is `hf-guard-venus` (listing `venus-guardian` stays **demo**). Task 3's dedicated seller is `yield-stable-router`; the recorded APY table is still the 2026-09-04 public-data snapshot.
