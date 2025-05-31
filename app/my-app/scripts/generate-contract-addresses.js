#!/usr/bin/env node

/**
 * Generate Contract Addresses
 * Reads Ignition deployment files and generates static TypeScript exports
 * This runs at build time to compile addresses into the bundle
 */

const fs = require('fs');
const path = require('path');

function generateContractAddresses() {
  console.log('🔧 Generating contract addresses from Ignition deployments...');

  const chainId = 4801; // Worldchain Sepolia
  const deploymentPath = path.join(
    __dirname,
    '../../smart-contract/ignition/deployments',
    `chain-${chainId}`,
    'deployed_addresses.json'
  );

  let addresses = {};
  
  try {
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = fs.readFileSync(deploymentPath, 'utf8');
      addresses = JSON.parse(deploymentData);
      console.log(`✅ Loaded addresses from: ${deploymentPath}`);
    } else {
      console.warn(`⚠️  Deployment file not found: ${deploymentPath}`);
      console.log('Using fallback addresses...');
    }
  } catch (error) {
    console.error(`❌ Error reading deployment file: ${error.message}`);
    console.log('Using fallback addresses...');
  }

  // Extract specific contract addresses with fallbacks
  const contractAddresses = {
    WORLD_ID_ADDRESS_BOOK: addresses["TestnetDeployment#MockWorldIDAddressBook"] || "0xA26948dA2413b7a009ae38334Cc787f292A290fe",
    ELECTION_MANAGER_ADDRESS: addresses["ElectionDeployment#ElectionManager"] || "0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7",
    PEER_RANKING_ADDRESS: addresses["PeerRankingDeployment#PeerRanking"] || "0x2caDc553c4B98863A3937fF0E710b79F7E855d8a"
  };

  // Generate TypeScript file
  const tsContent = `/**
 * Generated Contract Addresses
 * Auto-generated from Ignition deployments at build time
 * DO NOT EDIT MANUALLY - Run 'npm run generate-addresses' to update
 */

export const CHAIN_ID = ${chainId};

// Contract addresses for Worldchain Sepolia
export const WORLD_ID_ADDRESS_BOOK = "${contractAddresses.WORLD_ID_ADDRESS_BOOK}" as const;
export const ELECTION_MANAGER_ADDRESS = "${contractAddresses.ELECTION_MANAGER_ADDRESS}" as const;
export const PEER_RANKING_ADDRESS = "${contractAddresses.PEER_RANKING_ADDRESS}" as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: ${chainId},
  name: "Worldchain Sepolia",
  rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  blockExplorer: "https://worldchain-sepolia.blockscout.com",
} as const;

// Contract configuration
export const CONTRACTS = {
  WorldIDAddressBook: {
    address: WORLD_ID_ADDRESS_BOOK,
    verified: false,
  },
  ElectionManager: {
    address: ELECTION_MANAGER_ADDRESS,
    verified: false,
  },
  PeerRanking: {
    address: PEER_RANKING_ADDRESS,
    verified: false,
  },
} as const;

// Deployment info
export const DEPLOYMENT_INFO = {
  chainId: ${chainId},
  timestamp: "${new Date().toISOString()}",
  addresses: ${JSON.stringify(contractAddresses, null, 2)},
} as const;
`;

  // Write the generated file
  const outputPath = path.join(__dirname, '../src/config/contract-addresses.ts');
  fs.writeFileSync(outputPath, tsContent);
  
  console.log(`✅ Generated contract addresses: ${outputPath}`);
  console.log('📋 Contract addresses:');
  Object.entries(contractAddresses).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  
  return contractAddresses;
}

// Run if called directly
if (require.main === module) {
  try {
    generateContractAddresses();
    console.log('🎉 Contract address generation complete!');
  } catch (error) {
    console.error('❌ Failed to generate contract addresses:', error);
    process.exit(1);
  }
}

module.exports = { generateContractAddresses };
