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
