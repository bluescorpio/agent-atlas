/**
 * Minimum hireable Health Factor skill for Venus.
 *
 * Reads public Venus APIs (testnet first, then mainnet) and Comptroller
 * `getAccountLiquidity`. Does not repay, add collateral, or otherwise
 * mutate a borrow position.
 */

const GET_ACCOUNT_LIQUIDITY_SELECTOR = "0x5ec88c79";
const GET_ASSETS_IN_SELECTOR = "0xabfceffc";

const VENUS_API: Record<number, string> = {
  56: "https://api.venus.io",
  97: "https://testnetapi.venus.io",
};

const RPC: Record<number, string[]> = {
  56: [
    process.env.BSC_RPC_URL,
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-rpc.publicnode.com",
  ].filter((x): x is string => Boolean(x)),
  97: [
    process.env.BSC_TESTNET_RPC_URL,
    process.env.RPC_URL_BSC_TESTNET,
    "https://bsc-testnet.bnbchain.org",
    "https://bsc-testnet-rpc.publicnode.com",
  ].filter((x): x is string => Boolean(x)),
};

const WELL_KNOWN_CORE: Record<number, string> = {
  56: "0xfD36E2c2a6789Db23113685031d7F16329158384",
  97: "0x94d1820b2D1c7c7452A163983Dc888CEC546b77D",
};

export type HealthCheckInput = {
  borrower: string | null;
  protocol: string;
  hfThreshold: number;
};

export type MarketSnapshot = {
  symbol: string;
  address: string;
  chainId: number;
  pool: string;
  collateralFactor: string | null;
  liquidationThreshold: string | null;
  supplyApyDecimal: string | null;
  borrowApyDecimal: string | null;
};

export type LiquiditySnapshot = {
  chainId: number;
  pool: string;
  comptroller: string;
  error: string;
  liquidityUsd: string;
  shortfallUsd: string;
  status: "safe" | "at_threshold" | "liquidatable" | "no_position" | "rpc_error";
  rpcError?: string;
};

export type HealthCheckJson = {
  skill: "venus_health_factor";
  protocol: string;
  borrower: string | null;
  hfThreshold: number;
  formula: string;
  disclaimer: string;
  markets: MarketSnapshot[];
  accounts: LiquiditySnapshot[];
  conclusion: string;
  fetchedAt: string;
};

const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;

export function parseHealthTask(raw: string): HealthCheckInput {
  const text = raw || "";
  const addressMatch = text.match(ADDRESS_RE);
  const thresholdMatch = text.match(
    /(?:hf[_\s-]*threshold|threshold|alert)\s*[:=]?\s*(\d+(?:\.\d+)?)/i,
  );
  let protocol = "Venus";
  if (/\blista\b/i.test(text)) protocol = "Lista";
  else if (/\bvenus\b/i.test(text) || protocol) protocol = "Venus";
  const parsedThreshold = thresholdMatch ? Number(thresholdMatch[1]) : 1.2;
  return {
    borrower: addressMatch ? checksumHint(addressMatch[0]) : null,
    protocol,
    hfThreshold:
      Number.isFinite(parsedThreshold) && parsedThreshold > 0
        ? parsedThreshold
        : 1.2,
  };
}

function checksumHint(address: string): string {
  return `0x${address.slice(2)}`;
}

function mantissaToDecimal(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  try {
    const value = BigInt(String(raw));
    const whole = value / 10n ** 18n;
    const frac = (value % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
    return frac ? `${whole.toString()}.${frac}` : whole.toString();
  } catch {
    const n = Number(raw);
    return Number.isFinite(n) ? String(n) : String(raw);
  }
}

function weiUsdToNumber(raw: bigint): number {
  return Number(raw) / 1e18;
}

async function fetchJson(
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(url, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${url}`);
  }
  return response.json();
}

type PoolRow = {
  address?: string;
  name?: string;
  markets?: Array<Record<string, unknown>>;
};

function asPools(payload: unknown): PoolRow[] {
  if (Array.isArray(payload)) return payload as PoolRow[];
  if (payload && typeof payload === "object") {
    const rec = payload as Record<string, unknown>;
    if (Array.isArray(rec.result)) return rec.result as PoolRow[];
    if (Array.isArray(rec.data)) return rec.data as PoolRow[];
  }
  return [];
}

function pickUsdtAndCore(pools: PoolRow[], chainId: number): MarketSnapshot[] {
  const out: MarketSnapshot[] = [];
  for (const pool of pools) {
    const poolName = String(pool.name ?? "unknown");
    if (!poolName.toLowerCase().includes("core")) continue;
    for (const market of pool.markets ?? []) {
      const symbol = String(market.symbol ?? "");
      if (!/^vusdt$/i.test(symbol)) continue;
      out.push({
        symbol,
        address: String(market.address ?? ""),
        chainId,
        pool: poolName,
        collateralFactor: mantissaToDecimal(market.collateralFactorMantissa),
        liquidationThreshold: mantissaToDecimal(
          market.liquidationThresholdMantissa,
        ),
        supplyApyDecimal:
          market.supplyApyDecimal != null
            ? String(market.supplyApyDecimal)
            : null,
        borrowApyDecimal:
          market.borrowApyDecimal != null
            ? String(market.borrowApyDecimal)
            : null,
      });
    }
  }
  return out;
}

function coreComptroller(pools: PoolRow[], chainId: number): string {
  const core = pools.find((p) =>
    String(p.name ?? "").toLowerCase().includes("core"),
  );
  return core?.address || WELL_KNOWN_CORE[chainId] || WELL_KNOWN_CORE[56];
}

async function rpcCall(
  chainId: number,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ result?: string; error?: { message?: string } }> {
  const urls = RPC[chainId] ?? [];
  let last = "no rpc";
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...payload }),
      });
      const body = (await response.json()) as {
        result?: string;
        error?: { message?: string };
      };
      if (body.result) return body;
      last = body.error?.message || `HTTP ${response.status}`;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(last);
}

function decodeAddressArray(result: string): string[] {
  const hex = result.replace(/^0x/, "").padStart(64, "0");
  if (hex.length < 128) return [];
  const offset = Number(BigInt("0x" + hex.slice(0, 64)));
  const start = offset * 2;
  if (hex.length < start + 64) return [];
  const length = Number(BigInt("0x" + hex.slice(start, start + 64)));
  const out: string[] = [];
  for (let i = 0; i < length; i += 1) {
    const slice = hex.slice(start + 64 + i * 64, start + 128 + i * 64);
    if (slice.length < 64) break;
    out.push("0x" + slice.slice(24));
  }
  return out;
}

async function ethCallLiquidity(
  chainId: number,
  comptroller: string,
  account: string,
  pool: string,
  signal?: AbortSignal,
): Promise<LiquiditySnapshot> {
  const padded = account.slice(2).toLowerCase().padStart(64, "0");
  try {
    const liqBody = await rpcCall(
      chainId,
      {
        method: "eth_call",
        params: [
          { to: comptroller, data: GET_ACCOUNT_LIQUIDITY_SELECTOR + padded },
          "latest",
        ],
      },
      signal,
    );
    if (!liqBody.result || liqBody.result === "0x") {
      throw new Error(liqBody.error?.message || "empty eth_call result");
    }
    const hex = liqBody.result.slice(2).padStart(192, "0");
    const error = BigInt("0x" + hex.slice(0, 64));
    const liquidity = BigInt("0x" + hex.slice(64, 128));
    const shortfall = BigInt("0x" + hex.slice(128, 192));

    let marketsEntered = 0;
    try {
      const assetsBody = await rpcCall(
        chainId,
        {
          method: "eth_call",
          params: [
            { to: comptroller, data: GET_ASSETS_IN_SELECTOR + padded },
            "latest",
          ],
        },
        signal,
      );
      if (assetsBody.result) {
        marketsEntered = decodeAddressArray(assetsBody.result).length;
      }
    } catch {
      // best-effort; 0,0 with unknown markets is treated as no_position
    }

    let status: LiquiditySnapshot["status"] = "safe";
    if (shortfall > 0n) status = "liquidatable";
    else if (liquidity === 0n && shortfall === 0n) {
      status = marketsEntered > 0 ? "at_threshold" : "no_position";
    }
    return {
      chainId,
      pool,
      comptroller,
      error: error.toString(),
      liquidityUsd: weiUsdToNumber(liquidity).toFixed(6),
      shortfallUsd: weiUsdToNumber(shortfall).toFixed(6),
      status,
    };
  } catch (err) {
    return {
      chainId,
      pool,
      comptroller,
      error: "",
      liquidityUsd: "0",
      shortfallUsd: "0",
      status: "rpc_error",
      rpcError: err instanceof Error ? err.message : String(err),
    };
  }
}

function spokenSummary(json: HealthCheckJson): string {
  const marketBits = json.markets
    .slice(0, 4)
    .map((m) => {
      const cf = m.collateralFactor ? `CF ${Number(m.collateralFactor) * 100}%` : "CF n/a";
      const lt = m.liquidationThreshold
        ? `LT ${Number(m.liquidationThreshold) * 100}%`
        : "LT n/a";
      const apy = m.borrowApyDecimal
        ? `borrow APY ${(Number(m.borrowApyDecimal) * 100).toFixed(2)}%`
        : "";
      return `${m.symbol} on ${m.pool} (chain ${m.chainId}): ${cf}, ${lt}${apy ? `, ${apy}` : ""}`;
    })
    .join("; ");

  const accountBits = json.accounts.map((a) => {
    if (a.status === "rpc_error") {
      return `chain ${a.chainId} ${a.pool}: RPC failed (${a.rpcError}) — no fabricated HF`;
    }
    if (a.status === "no_position") {
      return `chain ${a.chainId} ${a.pool}: no entered Venus markets (liquidity=shortfall=0)`;
    }
    if (a.status === "liquidatable") {
      return `chain ${a.chainId} ${a.pool}: SHORTFALL $${a.shortfallUsd} → liquidatable (HF < 1, below alert ${json.hfThreshold})`;
    }
    if (a.status === "at_threshold") {
      return `chain ${a.chainId} ${a.pool}: liquidity and shortfall are both 0 → at liquidation threshold`;
    }
    return `chain ${a.chainId} ${a.pool}: excess liquidity $${a.liquidityUsd} (not liquidatable). Exact HF = (collateral × LT) / borrow was not reconstructed from this view call`;
  });

  const who = json.borrower ?? "no borrower address";
  return [
    `Venus Guardian health check for ${who} (protocol ${json.protocol}, alert threshold ${json.hfThreshold}).`,
    json.conclusion,
    marketBits ? `Markets: ${marketBits}.` : "No vUSDT market rows returned.",
    accountBits.length ? `Account: ${accountBits.join(" | ")}.` : "No account RPC attempted.",
    json.disclaimer,
  ].join(" ");
}

export async function runVenusHealthCheck(
  input: HealthCheckInput,
  signal?: AbortSignal,
): Promise<{ spoken: string; json: HealthCheckJson }> {
  const markets: MarketSnapshot[] = [];
  const accounts: LiquiditySnapshot[] = [];
  const errors: string[] = [];

  for (const chainId of [97, 56] as const) {
    try {
      const payload = await fetchJson(
        `${VENUS_API[chainId]}/pools?chainId=${chainId}`,
        signal,
      );
      const pools = asPools(payload);
      markets.push(...pickUsdtAndCore(pools, chainId));
      if (input.borrower) {
        const comptroller = coreComptroller(pools, chainId);
        accounts.push(
          await ethCallLiquidity(
            chainId,
            comptroller,
            input.borrower,
            "Core Pool",
            signal,
          ),
        );
      }
    } catch (err) {
      errors.push(
        `chain ${chainId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const liquidatable = accounts.some((a) => a.status === "liquidatable");
  const rpcFailed = accounts.length > 0 && accounts.every((a) => a.status === "rpc_error");
  const healthy = accounts.some((a) => a.status === "safe");
  let conclusion: string;
  if (input.protocol.toLowerCase() !== "venus") {
    conclusion = `Requested protocol ${input.protocol} is not implemented; ran Venus read-only checks instead.`;
  } else if (!input.borrower) {
    conclusion =
      "No borrower address supplied. Deliverable is market-level Venus CF/LT/APY only.";
  } else if (liquidatable) {
    conclusion = `Address is liquidatable on at least one Venus core pool (shortfall > 0, HF < 1), which is below the ${input.hfThreshold} alert.`;
  } else if (rpcFailed) {
    conclusion =
      "Venus market params fetched; account getAccountLiquidity RPC failed. Account HF is pending, not invented.";
  } else if (healthy) {
    conclusion = `No shortfall on queried Venus core pools. Position is not liquidatable at this snapshot. Exact continuous HF vs ${input.hfThreshold} needs collateral/borrow USD; this job does not repay or top up collateral.`;
  } else if (accounts.some((a) => a.status === "no_position") && !healthy && !liquidatable) {
    conclusion =
      "Address has no entered Venus core-pool markets on the chains that answered. Market-level CF/LT/APY still included.";
  } else if (accounts.some((a) => a.status === "at_threshold")) {
    conclusion = "Account sits at the liquidation threshold (liquidity = shortfall = 0).";
  } else {
    conclusion = errors.length
      ? `Partial data. ${errors.join("; ")}`
      : "Venus market params fetched; no account snapshot.";
  }

  const json: HealthCheckJson = {
    skill: "venus_health_factor",
    protocol: input.protocol,
    borrower: input.borrower,
    hfThreshold: input.hfThreshold,
    formula:
      "health_factor ≈ (collateral_value_usd × liquidation_threshold) / borrow_value_usd; HF < 1 is liquidatable. Comptroller.getAccountLiquidity returns excess liquidity XOR shortfall in USD (1e18).",
    disclaimer:
      "Read-only. Does not repay debt or add collateral. API rows can lag the chain.",
    markets,
    accounts,
    conclusion,
    fetchedAt: new Date().toISOString(),
  };
  if (errors.length) {
    (json as HealthCheckJson & { fetchErrors?: string[] }).fetchErrors = errors;
  }
  return { spoken: spokenSummary(json), json };
}

export async function renderHealthDeliverable(
  jobContext: string,
  signal?: AbortSignal,
): Promise<string> {
  const input = parseHealthTask(jobContext);
  const { spoken, json } = await runVenusHealthCheck(input, signal);
  return `${spoken}\n\n${JSON.stringify(json, null, 2)}`;
}
