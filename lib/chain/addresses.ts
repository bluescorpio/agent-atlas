/**
 * Confirmed BSC testnet (chain 97) registry addresses from CURSOR_TASKS.md §2.1.
 * Env overrides win when set.
 */
export const BSC_TESTNET_CHAIN_ID = 97;
export const IDENTITY_REGISTRY_TESTNET = '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const;
export const REPUTATION_REGISTRY_TESTNET = '0x8004B663056A597Dffe9eCcC1965A193B7388713' as const;

export function getRegistryAddresses() {
  const identity = (process.env.ERC8004_IDENTITY_REGISTRY
    || process.env.NEXT_PUBLIC_ERC8004_IDENTITY_REGISTRY
    || IDENTITY_REGISTRY_TESTNET) as `0x${string}`;
  const reputation = (process.env.ERC8004_REPUTATION_REGISTRY
    || process.env.NEXT_PUBLIC_ERC8004_REPUTATION_REGISTRY
    || REPUTATION_REGISTRY_TESTNET) as `0x${string}`;
  const validation = (process.env.ERC8004_VALIDATION_REGISTRY
    || process.env.NEXT_PUBLIC_ERC8004_VALIDATION_REGISTRY) as `0x${string}` | undefined;
  return { identity, reputation, validation };
}
