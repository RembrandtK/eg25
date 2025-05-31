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
    PeerRanking: ContractConfig;
    MockWorldID: ContractConfig;
  };
}

// Contract addresses from Ignition deployments
// Last updated: 2025-05-31T20:32:11.788Z
const DEPLOYED_ADDRESSES = {
  "480": {},
  "4801": {
    "ElectionDeployment#MockWorldID": "0xD1475b98eAE5335eDB90Ab7bB46d029c18cb24ab",
    "ElectionDeployment#ElectionManager": "0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC"
  }
};

// World Chain Sepolia (Testnet)
export const WORLD_CHAIN_SEPOLIA: NetworkConfig = {
  chainId: 4801,
  name: "World Chain Sepolia",
  rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  blockExplorer: "https://worldchain-sepolia.blockscout.com",
  contracts: {
    MockWorldID: {
      address: DEPLOYED_ADDRESSES[4801]["ElectionDeployment#MockWorldID"] || "",
      verified: false,
    },
    ElectionManager: {
      address: DEPLOYED_ADDRESSES[4801]["ElectionDeployment#ElectionManager"] || "",
      verified: false,
    },
    PeerRanking: {
      address: DEPLOYED_ADDRESSES[4801]["PeerRankingDeployment#PeerRanking"] || "",
      verified: false,
    },
  },
};

// World Chain Mainnet (Production)
export const WORLD_CHAIN_MAINNET: NetworkConfig = {
  chainId: 480,
  name: "World Chain",
  rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public",
  blockExplorer: "https://worldscan.org",
  contracts: {
    WorldIDAddressBook: {
      address: "0x57b930D551e677CC36e2fA036Ae2fe8FdaE0330D", // Official World ID Address Book
      verified: true,
    },
    ElectionManager: {
      address: DEPLOYED_ADDRESSES[480]["FullDeployment#ElectionManager"] || "",
      verified: false,
    },
    PeerRanking: {
      address: DEPLOYED_ADDRESSES[480]["FullDeployment#PeerRanking"] || "",
      verified: false,
    },
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

  if (!contract.address) {
    throw new Error(`${contractName} not deployed on ${config.name}`);
  }

  return contract.address;
}

// Export for convenience
export const CURRENT_NETWORK = getCurrentNetworkConfig();
export const ELECTION_MANAGER_ADDRESS = getContractAddress('ElectionManager');
export const MOCK_WORLD_ID_ADDRESS = getContractAddress('MockWorldID');

// Optional contracts - may not be deployed on all networks
export const PEER_RANKING_ADDRESS = (() => {
  try {
    return getContractAddress('PeerRanking');
  } catch (error) {
    console.warn('PeerRanking not deployed on current network');
    return '';
  }
})();
