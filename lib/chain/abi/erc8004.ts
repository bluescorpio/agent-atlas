/**
 * Official ERC-8004 ABIs from
 * https://github.com/erc-8004/erc-8004-contracts/blob/master/abis/
 * fetched 2026-09-25 (IdentityRegistry.json, ReputationRegistry.json).
 *
 * Identity has register / setAgentURI / ownerOf / tokenURI / getAgentWallet /
 * getMetadata / getVersion. It does NOT implement ERC-721 Enumerable
 * (no totalSupply / tokenByIndex) — enumerate via ownerOf binary search
 * and Registered logs, not tokenByIndex.
 */
import type { Abi } from 'viem';
import identityJson from './IdentityRegistry.json';
import reputationJson from './ReputationRegistry.json';

export const identityRegistryAbi = identityJson as Abi;
export const reputationRegistryAbi = reputationJson as Abi;
