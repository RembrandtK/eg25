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
    WorldIDAddressBook: ContractConfig;
    ElectionManager: ContractConfig;
    PeerRanking: ContractConfig;
  };
}

// Contract addresses from Ignition deployments
// Last updated: 2025-05-31T08:37:14.526Z
const DEPLOYED_ADDRESSES = {
  "480": {},
  "4801": {
    "PeerRankingDeployment#PeerRanking": "0xE5546c2131cfE89b285bFFfEa21Ec8B10D95F2E1"
  }
};

// World Chain Sepolia (Testnet)
export const WORLD_CHAIN_SEPOLIA: NetworkConfig = {
  chainId: 4801,
  name: "World Chain Sepolia",
  rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  blockExplorer: "https://worldchain-sepolia.blockscout.com",
  contracts: {
    WorldIDAddressBook: {
      address: DEPLOYED_ADDRESSES[4801]["TestnetDeployment#MockWorldIDAddressBook"] || "",
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
export const TUTE_ADDRESS = getContractAddress('TUTE');
export const WORLD_ID_ADDRESS_BOOK = getContractAddress('WorldIDAddressBook');
export const ELECTION_MANAGER_ADDRESS = getContractAddress('ElectionManager');
export const PEER_RANKING_ADDRESS = getContractAddress('PeerRanking');
