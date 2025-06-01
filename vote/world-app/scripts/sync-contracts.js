#!/usr/bin/env node

/**
 * Sync contract addresses from Ignition deployments to the frontend config
 *
 * This script reads the deployed addresses from Ignition and updates
 * the contracts.ts file with the latest addresses.
 *
 * Usage: pnpm run sync-contracts
 */

const fs = require('fs');
const path = require('path');

// Paths
const SMART_CONTRACT_DIR = path.join(__dirname, '../../contracts');
const CONTRACTS_CONFIG_PATH = path.join(__dirname, '../src/config/contracts.ts');

// Network configurations
const NETWORKS = {
  4801: {
    name: 'World Chain Sepolia',
    deploymentModule: 'TestnetDeployment',
  },
  480: {
    name: 'World Chain Mainnet',
    deploymentModule: 'FullDeployment',
  },
};

function readIgnitionAddresses(chainId) {
  const deploymentPath = path.join(
    SMART_CONTRACT_DIR,
    'ignition/deployments',
    `chain-${chainId}`,
    'deployed_addresses.json'
  );

  if (fs.existsSync(deploymentPath)) {
    try {
      return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    } catch (error) {
      console.warn(`Failed to read addresses for chain ${chainId}:`, error.message);
    }
  }

  return {};
}

function generateContractsConfig() {
  const timestamp = new Date().toISOString();

  // Read addresses for all networks
  const deployedAddresses = {};
  for (const chainId of Object.keys(NETWORKS)) {
    deployedAddresses[chainId] = readIgnitionAddresses(parseInt(chainId));
  }

  // Generate the TypeScript config file
  const config = `/**
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
// Last updated: ${timestamp}
const DEPLOYED_ADDRESSES = ${JSON.stringify(deployedAddresses, null, 2)};

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
    throw new Error(\`Unsupported chain ID: \${chainId}\`);
  }

  return config;
}

// Get contract address for current network
export function getContractAddress(contractName: keyof NetworkConfig['contracts']): string {
  const config = getCurrentNetworkConfig();
  const contract = config.contracts[contractName];

  if (!contract?.address) {
    throw new Error(\`\${contractName} not deployed on \${config.name}\`);
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
`;

  return config;
}

function main() {
  console.log('🔄 Syncing contract addresses from Ignition...');

  // Check if smart contract directory exists
  if (!fs.existsSync(SMART_CONTRACT_DIR)) {
    console.error('❌ Smart contract directory not found:', SMART_CONTRACT_DIR);
    process.exit(1);
  }

  // Generate new config
  const newConfig = generateContractsConfig();

  // Write to file
  fs.writeFileSync(CONTRACTS_CONFIG_PATH, newConfig);

  console.log('✅ Contract addresses synced successfully!');
  console.log('📝 Updated:', CONTRACTS_CONFIG_PATH);

  // Show summary
  console.log('\n📋 Current deployments:');
  for (const [chainId, network] of Object.entries(NETWORKS)) {
    const addresses = readIgnitionAddresses(parseInt(chainId));
    console.log(`\n🌐 ${network.name} (Chain ID: ${chainId})`);

    if (Object.keys(addresses).length === 0) {
      console.log('   ❌ No deployments found');
    } else {
      Object.entries(addresses).forEach(([name, address]) => {
        const contractName = name.split('#')[1];
        console.log(`   ✅ ${contractName}: ${address}`);
      });
    }
  }

  console.log('\n🎯 Next steps:');
  console.log('1. Commit the updated contracts.ts file to git');
  console.log('2. Update your .env.local with NEXT_PUBLIC_CHAIN_ID if needed');
  console.log('3. Restart your development server');
  console.log('4. Generate CONTRACTS.md: cd ../contracts && pnpm run generate:contracts-md');
  console.log('5. Verify contracts: cd ../contracts && pnpm run verify:blockscout:sepolia');
}

if (require.main === module) {
  main();
}
