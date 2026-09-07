# hfguardvenus — A2A + X402 seller agent (managed-platform trial)

The valuable Agent and the **SOLE key-holder/signer** for the hfguardvenus seller,
configured for the **BNB Chain managed platform** (`[deploy].destination =
"platform"`) — a 48h **testnet-only** trial sandbox. It serves the SAME
A2A + X402 surface as a self-deploy (`serveA2a`: the agent card at `/.well-known/agent-card.json` + JSON-RPC `message/send` on `0.0.0.0:9000`); every signing op is fixed
entrypoint code in `src/signing.ts` — never an LLM-callable tool.

`notify_funded` runs the Venus health-factor skill in `src/venusHealth.ts`
(public API + Comptroller `getAccountLiquidity`). It does not repay or add collateral.

## What's here

- `src/unifiedMain.ts` — unified serving entrypoint (A2A on port 9000 + Foundry invocations on 8088).
- `src/executor.ts` — the SellerAgentExecutor: the negotiate + notify_funded A2A skills.
- `src/agentCard.ts` — the discoverable AgentCard (+ OAuth2/Cognito scheme).
- `src/signing.ts` — protocol-neutral signing entrypoints. ALL on-chain writes
  go through these functions — never an LLM-callable tool.
- `src/venusHealth.ts` — read-only Venus health check that becomes the ERC-8183 deliverable.
- `src/model.ts` — provider adapter (kept for doctor/deploy; delivery does not call the LLM).
- `src/tools.ts` — read-only chain tools.
- `studio.toml` — Agent's own config (wallet, LLM, price bounds, budget).
- the wallet key material lives OUTSIDE this sub-project so deploy packaging can
  never bundle it: an evm-local keystore at the WORKSPACE root `.studio/wallets/`,
  or the twak mnemonic in the project's twak home (gitignored either way).
- `.env.local` — Agent secrets; on deploy they are sent to the **operator's**
  Secrets Manager (the scoped, consented commitment-#2 exception). Use a
  THROWAWAY testnet wallet — `(cd app/agent && bag wallet new)`.

## Run locally

`bag dev` from the workspace root runs the A2A + X402 server in-process
(`tsx src/unifiedMain.ts`, no Docker) on its contract port:

```bash
bag dev                                    # A2A + X402 on http://localhost:9000
```

It auto-loads `.studio/.env.local` — no need to `source` it.

## Deploy (managed platform — 48h testnet trial)

```bash
bag platform login                         # GitHub device flow (~/.bnbagent-deploy/bnb/session.json)
# From the workspace root:
bag deploy --provider bnb                  # explicit 48h trial provider
```

If the BNB trial is expired, use `bag deploy --provider aws` in the operator's
own AWS account instead.
