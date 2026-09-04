# Agent Advantage Report

TermiX three-task record. **No fabricated numbers.** Incomplete steps stay **pending**. Job 963 is **SUBMITTED**, not settled (24h dispute window).

| Task | Domain | Live evidence | Status |
| --- | --- | --- | --- |
| [Task 1 — Grid trading](./task-1-grid-trading/) | Trading | ERC-8183 job `963` `SUBMITTED` + [deliverable](https://bnbagent-api.bnbchain.world/v1/deliverables/sha256/7a5646139eefd148676d12a1e59c9f9e02a4c378cb9f235b74ede4808df251e5.json) | **Complete** |
| [Task 2 — Health factor](./task-2-health-factor/) | Security / DeFi | Venus vUSDT risk params from `api.venus.io` | Partial (no borrower account HF) |
| [Task 3 — Stablecoin yield](./task-3-yield/) | DeFi | Venus + DefiLlama USDT APYs fetched 2026-09-04 | Complete as a public-data check |

Deployed seller used where applicable: `grid-bnb-usdt` (ERC-8004 `2066`, BSC testnet). Tasks 2–3 are **not** that agent’s skill; they use the same “look up live protocol data” toolchain instead of inventing a health-factor/yield agent.
