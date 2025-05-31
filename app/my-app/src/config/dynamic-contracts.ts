/**
 * Dynamic Contract Configuration
 * Reads contract addresses directly from Ignition deployment files on-demand
 * This eliminates the need for manual synchronization and reduces deployment errors
 */

import fs from 'fs';
import path from 'path';

export interface ContractConfig {
  address: string;
  verified: boolean;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contracts: {
    TUTE: ContractConfig;
    WorldIDAddressBook: ContractConfig;
    ElectionManager: ContractConfig;
    PeerRanking: ContractConfig;
  };
}

// Cache for deployment addresses to avoid repeated file reads
let deploymentCache: Record<number, Record<string, string>> = {};
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Read deployment addresses from Ignition deployment files
 */
function readDeploymentAddresses(chainId: number): Record<string, string> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (deploymentCache[chainId] && (now - cacheTimestamp) < CACHE_TTL) {
    return deploymentCache[chainId];
  }

  try {
    // Path to Ignition deployment file
    const deploymentPath = path.join(
      process.cwd(),
      '../smart-contract/ignition/deployments',
      `chain-${chainId}`,
      'deployed_addresses.json'
    );

    // Check if file exists
    if (!fs.existsSync(deploymentPath)) {
      console.warn(`⚠️  Deployment file not found for chain ${chainId}: ${deploymentPath}`);
      return {};
    }

    // Read and parse deployment file
    const deploymentData = fs.readFileSync(deploymentPath, 'utf8');
    const addresses = JSON.parse(deploymentData);

    // Update cache
    deploymentCache[chainId] = addresses;
    cacheTimestamp = now;

    console.log(`📖 Loaded deployment addresses for chain ${chainId}:`, Object.keys(addresses));
    return addresses;

  } catch (error) {
    console.error(`❌ Failed to read deployment addresses for chain ${chainId}:`, error);
    return {};
  }
}

/**
 * Get contract address from deployment data
 */
function getDeployedAddress(chainId: number, deploymentKey: string): string {
  const deployments = readDeploymentAddresses(chainId);
  const address = deployments[deploymentKey];
  
  if (!address) {
    console.warn(`⚠️  Contract ${deploymentKey} not found in deployments for chain ${chainId}`);
    return "";
  }
  
  return address;
}

// Network configurations
export const WORLD_CHAIN_SEPOLIA: NetworkConfig = {
  chainId: 4801,
  name: "Worldchain Sepolia",
  rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  blockExplorer: "https://worldchain-sepolia.blockscout.com",
  contracts: {
    TUTE: {
      get address() { return getDeployedAddress(4801, "TestnetDeployment#TUTE"); },
      verified: false,
    },
    WorldIDAddressBook: {
      get address() { return getDeployedAddress(4801, "TestnetDeployment#MockWorldIDAddressBook"); },
      verified: false,
    },
    ElectionManager: {
      get address() { return getDeployedAddress(4801, "ElectionDeployment#ElectionManager"); },
      verified: false,
    },
    PeerRanking: {
      get address() { return getDeployedAddress(4801, "PeerRankingDeployment#PeerRanking"); },
      verified: false,
    },
  },
};

export const WORLD_CHAIN_MAINNET: NetworkConfig = {
  chainId: 480,
  name: "Worldchain Mainnet",
  rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public",
  blockExplorer: "https://worldchain.blockscout.com",
  contracts: {
    TUTE: {
      get address() { return getDeployedAddress(480, "MainnetDeployment#TUTE"); },
      verified: false,
    },
    WorldIDAddressBook: {
      address: "0x57b930D551e677CC36e2fA036Ae2fe8FdaE0330D", // Official World ID Address Book
      verified: true,
    },
    ElectionManager: {
      get address() { return getDeployedAddress(480, "ElectionDeployment#ElectionManager"); },
      verified: false,
    },
    PeerRanking: {
      get address() { return getDeployedAddress(480, "PeerRankingDeployment#PeerRanking"); },
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
    throw new Error(`${contractName} not deployed on ${config.name} (chain ${config.chainId})`);
  }

  return contract.address;
}

// Utility function to refresh deployment cache
export function refreshDeploymentCache(): void {
  deploymentCache = {};
  cacheTimestamp = 0;
  console.log("🔄 Deployment cache refreshed");
}

// Utility function to get all deployed contracts for debugging
export function getDeploymentStatus(chainId?: number): Record<string, any> {
  const targetChainId = chainId || getCurrentNetworkConfig().chainId;
  const deployments = readDeploymentAddresses(targetChainId);
  
  return {
    chainId: targetChainId,
    deployments,
    contractAddresses: {
      TUTE: getDeployedAddress(targetChainId, "TestnetDeployment#TUTE"),
      WorldIDAddressBook: getDeployedAddress(targetChainId, "TestnetDeployment#MockWorldIDAddressBook"),
      ElectionManager: getDeployedAddress(targetChainId, "ElectionDeployment#ElectionManager"),
      PeerRanking: getDeployedAddress(targetChainId, "PeerRankingDeployment#PeerRanking"),
    }
  };
}

// Export for convenience (these will be dynamically resolved)
export const CURRENT_NETWORK = getCurrentNetworkConfig();
export const TUTE_ADDRESS = getContractAddress('TUTE');
export const WORLD_ID_ADDRESS_BOOK = getContractAddress('WorldIDAddressBook');
export const ELECTION_MANAGER_ADDRESS = getContractAddress('ElectionManager');
export const PEER_RANKING_ADDRESS = getContractAddress('PeerRanking');
