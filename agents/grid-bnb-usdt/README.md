# Grid BNB / USDT

BNB Agent Studio seller for marketplace listing `grid-bnb-usdt` (**live**).

## Intended behaviour

- Fixed pair: BNB/USDT on PancakeSwap.
- Exposed parameters: `gridCount`, `lowerPrice`, `upperPrice`, and `budgetCap`.
- The agent places N buy/sell levels inside the user-provided bounds and re-posts the opposite order after a fill.

## Deployment status (2026-09-07)

| Field | Value |
| --- | --- |
| **ERC-8004** | `2066` |
| **Wallet** | `0x3573e861363880f18F357Ca8258FA1393573d676` |
| **AgentCore runtime** | `arn:aws:bedrock-agentcore:us-east-1:850122838544:runtime/gridbnbusdt-bohsdVE5Pv` |
| **Verified hire** | ERC-8183 job `963` `SUBMITTED` (BSC testnet) |
