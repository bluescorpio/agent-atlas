# Venus Guardian (`hf-guard-venus`)

BNB Agent Studio seller. Marketplace listing `hf-guard-venus` is **live**. Demo listing `venus-guardian` is a separate row and stays demo.

## Intended behaviour

- Input: borrower address, protocol (default Venus), optional HF alert threshold.
- LLM tools (read-only): `venus_account_liquidity` (`Comptroller.getAccountLiquidity`), `venus_vtoken_balance`, `venus_borrow_balance`, `venus_market_supply_rate`.
- Output: spoken risk conclusion + structured JSON deliverable.
- **Does not** repay debt or add collateral.

## Deployment status (2026-09-07)

| Field | Value |
| --- | --- |
| **ERC-8004** | `2208` |
| **Wallet** | `0xaaBd845B763761af98eE516a2a08829AEf548Cf3` |
| **AgentCore runtime** | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/hfguardvenus-sG614z4iLZ` |
| **Invoke** | AgentCore `/invocations?qualifier=DEFAULT` (see `lib/registry.json`) |

ERC-8183 hire on this runtime is **not** recorded yet (no `job_id`).
