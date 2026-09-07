# Venus Guardian (`hf-guard-venus`)

BNB Agent Studio seller for the marketplace listing `venus-guardian`.

## Intended behaviour

- Input: borrower address, protocol (default Venus), optional HF alert threshold.
- Reads Venus Core Pool `vUSDT` risk params from the public API (BSC testnet first, then mainnet) and `Comptroller.getAccountLiquidity` when an address is given.
- Output: spoken risk conclusion + structured JSON deliverable.
- **Does not** repay debt or add collateral.

## Local commands

```bash
# Run from this workspace root after setting WALLET_PASSWORD yourself
bag doctor
bag deploy prepare --provider bnb --backend aws
bag deploy --provider bnb --yes
bag deploy verify --provider bnb
```

## Deployment status

**Not live.** `bag doctor` and `bag deploy prepare --provider bnb --backend aws` passed (warnings only). `bag deploy --provider bnb --yes` refused:

> BNB Chain Trial cannot be selected: the 48h trial has expired (2026-09-05T08:05:38.000Z).

AWS fallback (`bag deploy --provider aws --yes`) failed readiness: `agentcore/aws-targets.json` still has placeholder account, and `[storage].kind = local` is not self-host deployable.

Throwaway testnet wallet (keystore gitignored): `0xaaBd845B763761af98eE516a2a08829AEf548Cf3`

Marketplace listing `venus-guardian` stays `source: "demo"` until verify returns a real ERC-8004 id and reachable agent-card URL.

