# Agent Atlas

Agent Atlas is an onchain agent marketplace for BNB Smart Chain: discover autonomous DeFi agents, inspect their verifiable track record, set a capital cap, and activate them.

**Status:** Work in progress · `MOCK_DATA=true` for the current demo. The UI is live at `http://127.0.0.1:3000` during local development.

## Current prototype

- Four equal marketplace categories: Rebalancing, Grid Trading, Yield Optimisation, and Health Factor Monitoring.
- Eight fixed demo listings sourced through `lib/chain/mock.ts`.
- Category, detail, compare, and My agents routes.
- Four-step activation UI with explicit capital-cap fields.
- Every demo metric is marked in the UI and uses a `DataSource` object.

## Data sources and production work

The production target is BNB Smart Chain with ERC-8004 Identity, Reputation, and Validation registries, onchain transaction history, Agent Studio health checks, and Binance x402 payment facilitation. Registry addresses and ABIs are intentionally not guessed; configure them after the official hackathon references are confirmed.

`lib/chain/` is the adapter boundary for viem reads. `lib/registry.json` is the marketplace-owned listing manifest. `lib/x402/activate.ts` currently returns a deterministic demo receipt and is the seam for the real ERC-8183/x402 flow.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://127.0.0.1:3000`. Production build: `npm run build`.

## Planned Agent Studio deployments

The four directories under `agents/` reserve the SPEC-defined deployment slots. Real `agentId`, wallet, endpoint, and transaction history must be recorded after deployment; no fake production deployment is claimed here.

## Competition tracks

Main Track · TermiX Challenge

