/**
 * Canonical BSC testnet ERC-8183 stack used by Agent Atlas.
 *
 * Commerce + $U are the addresses confirmed against a live negotiate
 * envelope. Router / policy are the SDK `bsc-testnet` pair for that same
 * commerce proxy — `registerJob` cannot run without them.
 */
export const ERC8183_CHAIN_ID = 97;
export const U_TOKEN = '0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565' as const;
export const ERC8183_COMMERCE = '0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de' as const;
export const ERC8183_ROUTER = '0xd7d36d66d2f1b608a0f943f722d27e3744f66f25' as const;
export const ERC8183_POLICY = '0xd6a4217588f6b1f5657a92a3e94e6422ad771cea' as const;
export const ERC8183_NETWORK = 'bsc-testnet' as const;
export const DEFAULT_DEADLINE_MINUTES = 30;
export const U_DECIMALS = 18;

/** Live grid-bnb-usdt runtime on bnbagent-api (BSC testnet). */
export const GRID_RUNTIME_ID = '01M1K4SSXB6VA50K5C6FV6E4JK';
export const GRID_A2A_INVOKE_URL =
  `https://bnbagent-api.bnbchain.world/v1/rt/${GRID_RUNTIME_ID}/a2a` as const;
export const BNBAGENT_OAUTH_TOKEN_URL = 'https://bnbagent-api.bnbchain.world/v1/oauth/token';

/** Seller quotes expire 15 minutes after `negotiated_at`. */
export const QUOTE_TTL_SECONDS = 15 * 60;

export const JOB_STATUS_OPEN = 0;
export const JOB_STATUS_FUNDED = 1;
export const JOB_STATUS_SUBMITTED = 2;
export const JOB_STATUS_COMPLETED = 3;
export const JOB_STATUS_REJECTED = 4;
export const JOB_STATUS_EXPIRED = 5;

export const POLL_INTERVAL_MS = 5_000;
export const POLL_MAX_ATTEMPTS = 48;

/** After SUBMITTED, retry deliverable_url this many times before failing. */
export const DELIVERABLE_URL_MAX_ATTEMPTS = 12;
export const DELIVERABLE_URL_INTERVAL_MS = 5_000;
