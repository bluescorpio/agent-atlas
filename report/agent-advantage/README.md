# Agent Advantage Report

TermiX three-task record. **No fabricated numbers.** Incomplete steps stay **pending**. Job 963 is **SUBMITTED**, not settled (24h dispute window).

| Task | Domain | Live evidence | Status |
| --- | --- | --- | --- |
| [Task 1 — Grid trading](./task-1-grid-trading/) | Trading | ERC-8183 job `963` `SUBMITTED` + [deliverable](https://bnbagent-api.bnbchain.world/v1/deliverables/sha256/7a5646139eefd148676d12a1e59c9f9e02a4c378cb9f235b74ede4808df251e5.json) | **Complete** |
| [Task 2 — Health factor](./task-2-health-factor/) | Security / DeFi | Venus vUSDT params + local `hf-guard-venus` smoke (`no_position`); **no ERC-8183 hire** (BNB trial expired 2026-09-05) | Partial (scaffold ready, listing still demo) |
| [Task 3 — Stablecoin yield](./task-3-yield/) | DeFi | Venus + DefiLlama USDT APYs fetched 2026-09-04 | Complete as a public-data check |

Deployed seller used where applicable: `grid-bnb-usdt` (ERC-8004 `2066`, BSC testnet) for Task 1. Task 2 now has a dedicated seller scaffold (`agents/hf-guard-venus`) but is **not live** — BNB Studio trial expired 2026-09-05, so there is no hire `job_id`. Task 3 still uses the public-data toolchain.
