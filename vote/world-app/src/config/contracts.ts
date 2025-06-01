/**
 * Contract addresses and configuration
 *
 * This file contains the deployed contract addresses from Ignition.
 * It should be updated after each deployment using the sync script:
 *
 * pnpm run sync-contracts
 *
 * The addresses are read from ../smart-contract/ignition/deployments/
 * and this file is checked into git for team synchronization.
 */

export interface ContractConfig {
  address: string;
  deployedAt?: string;
  blockNumber?: number;
  verified?: boolean;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contracts: {
    ElectionManager: ContractConfig;
    MockWorldID?: ContractConfig; // Optional - only for local development
  };
}

// Contract addresses from Ignition deployments
// Last updated: 2025-06-01T06:37:21.699Z
const DEPLOYED_ADDRESSES = {
  "480": {},
  "4801": {
    "ElectionDeployment#ElectionManager": "0xE633498333Cc9079340EAE0864D001336211d111"
  }
};

// World Chain Sepolia (Testnet)
export const WORLD_CHAIN_SEPOLIA: NetworkConfig = {
  chainId: 4801,
  name: "World Chain Sepolia",
  rpcUrl: process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC || "",
  blockExplorer: "https://worldchain-sepolia.blockscout.com",
  contracts: {
    ElectionManager: {
      address: DEPLOYED_ADDRESSES[4801]["ElectionDeployment#ElectionManager"] || "",
      verified: false,
    },
    // No MockWorldID on testnet - uses real World ID infrastructure
  },
};

// World Chain Mainnet (Production)
export const WORLD_CHAIN_MAINNET: NetworkConfig = {
  chainId: 480,
  name: "World Chain",
  rpcUrl: process.env.NEXT_PUBLIC_WORLDCHAIN_MAINNET_RPC || "",
  blockExplorer: "https://worldscan.org",
  contracts: {
    ElectionManager: {
      address: DEPLOYED_ADDRESSES[480]["FullDeployment#ElectionManager"] || "",
      verified: false,
    },
    // No MockWorldID on mainnet - uses real World ID infrastructure
  },
};

// Network mapping
export const NETWORKS: Record<number, NetworkConfig> = {
  [WORLD_CHAIN_SEPOLIA.chainId]: WORLD_CHAIN_SEPOLIA,
  [WORLD_CHAIN_MAINNET.chainId]: WORLD_CHAIN_MAINNET,
};

// Get current network config based on environment
export function getCurrentNetworkConfig(): NetworkConfig {
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID
    ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID)
    : WORLD_CHAIN_SEPOLIA.chainId; // Default to testnet

  const config = NETWORKS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return config;
}

// Get contract address for current network
export function getContractAddress(contractName: keyof NetworkConfig['contracts']): string {
  const config = getCurrentNetworkConfig();
  const contract = config.contracts[contractName];

  if (!contract?.address) {
    throw new Error(`${contractName} not deployed on ${config.name}`);
  }

  return contract.address;
}

// Safe getter for optional MockWorldID (only available on local development)
export function getMockWorldIdAddress(): string | null {
  try {
    const config = getCurrentNetworkConfig();
    return config.contracts.MockWorldID?.address || null;
  } catch {
    return null;
  }
}

// Export for convenience
export const CURRENT_NETWORK = getCurrentNetworkConfig();
export const ELECTION_MANAGER_ADDRESS = getContractAddress('ElectionManager');
