export function getRegistryAddresses() {
  const identity = process.env.ERC8004_IDENTITY_REGISTRY;
  const reputation = process.env.ERC8004_REPUTATION_REGISTRY;
  const validation = process.env.ERC8004_VALIDATION_REGISTRY;
  if (!identity || !reputation || !validation) {
    throw new Error('ERC8004_REGISTRY_ADDRESSES_REQUIRED');
  }
  return { identity: identity as `0x${string}`, reputation: reputation as `0x${string}`, validation: validation as `0x${string}` };
}
