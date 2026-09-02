# Grid BNB / USDT

BNB Agent Studio seller scaffold for the first marketplace agent.

## Intended behaviour

- Fixed pair: BNB/USDT on PancakeSwap.
- Exposed parameters: `gridCount`, `lowerPrice`, `upperPrice`, and `budgetCap`.
- The agent places N buy/sell levels inside the user-provided bounds and re-posts the opposite order after a fill.
- Every fill and management action must be recorded onchain before the listing can be marked `live`.

## Deployment status

The Studio scaffold is present under `app/agent/`, but this agent is **not deployed yet**. Do not add a production `agentId`, wallet, endpoint, or registration transaction hash until `bag deploy` and `bag deploy verify` return them. The marketplace manifest therefore remains `source: "demo"`.

## Local commands

```bash
# Run from this workspace root after setting WALLET_PASSWORD yourself
bag doctor
bag dev
```
