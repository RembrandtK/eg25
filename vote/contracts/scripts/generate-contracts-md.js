#!/usr/bin/env node

/**
 * Generate CONTRACTS.md file from Ignition deployment data with Blockscout integration
 * 
 * This script:
 * 1. Reads Ignition deployment artifacts from all networks
 * 2. Fetches contract information from Blockscout APIs
 * 3. Generates a comprehensive CONTRACTS.md file with tables and links
 * 
 * Usage: node scripts/generate-contracts-md.js
 */

const fs = require('fs');
const path = require('path');
const { getMultipleContractsInfo, getNetworkConfig, NETWORKS } = require('./blockscout-api');

// Paths
const IGNITION_DEPLOYMENTS_DIR = path.join(__dirname, '../ignition/deployments');
const OUTPUT_FILE = path.join(__dirname, '../../../CONTRACTS.md');

/**
 * Read Ignition deployment addresses for a specific chain
 */
function readIgnitionAddresses(chainId) {
  const deploymentDir = path.join(IGNITION_DEPLOYMENTS_DIR, `chain-${chainId}`);
  const addressesFile = path.join(deploymentDir, 'deployed_addresses.json');
  
  if (!fs.existsSync(addressesFile)) {
    console.log(`No deployments found for chain ${chainId}`);
    return {};
  }
  
  try {
    return JSON.parse(fs.readFileSync(addressesFile, 'utf8'));
  } catch (error) {
    console.error(`Error reading addresses for chain ${chainId}:`, error.message);
    return {};
  }
}

/**
 * Parse contract name from Ignition module key
 */
function parseContractName(moduleKey) {
  // Extract contract name from keys like "ElectionDeployment#ElectionManager"
  const parts = moduleKey.split('#');
  return parts.length > 1 ? parts[1] : parts[0];
}

/**
 * Get deployment module name from contract key
 */
function getDeploymentModule(moduleKey) {
  const parts = moduleKey.split('#');
  return parts.length > 1 ? parts[0] : 'Unknown';
}

/**
 * Generate markdown table for contracts on a network
 */
function generateNetworkTable(networkConfig, contracts) {
  if (!contracts || contracts.length === 0) {
    return `> No contracts deployed on ${networkConfig.name}\n\n`;
  }

  let table = `| Contract | Address | Verified | Compiler | Block Explorer |\n`;
  table += `|----------|---------|----------|----------|----------------|\n`;

  contracts.forEach(contract => {
    const verifiedIcon = contract.isVerified ? '✅' : '❌';
    const compiler = contract.compilerVersion || 'Unknown';
    const explorerLink = `[View](${contract.blockscoutUrl})`;

    table += `| ${contract.name} | \`${contract.address}\` | ${verifiedIcon} | ${compiler} | ${explorerLink} |\n`;
  });

  return table + '\n';
}

/**
 * Generate contract details section
 */
function generateContractDetails(contracts) {
  let details = `## Contract Details\n\n`;
  
  contracts.forEach(contract => {
    if (!contract) return;
    
    details += `### ${contract.name}\n\n`;
    details += `- **Address**: \`${contract.address}\`\n`;
    details += `- **Network**: ${contract.networkName}\n`;
    details += `- **Verified**: ${contract.isVerified ? 'Yes' : 'No'}\n`;
    
    if (contract.compilerVersion) {
      details += `- **Compiler**: ${contract.compilerVersion}\n`;
    }
    
    if (contract.evmVersion) {
      details += `- **EVM Version**: ${contract.evmVersion}\n`;
    }
    
    if (contract.optimizationEnabled !== undefined) {
      details += `- **Optimization**: ${contract.optimizationEnabled ? 'Enabled' : 'Disabled'}\n`;
    }
    
    if (contract.createdAtBlock) {
      details += `- **Deployed at Block**: ${contract.createdAtBlock}\n`;
    }
    
    details += `- **Block Explorer**: [View on ${contract.networkName}](${contract.blockscoutUrl})\n`;
    
    if (contract.deploymentModule) {
      details += `- **Deployment Module**: ${contract.deploymentModule}\n`;
    }
    
    details += '\n';
  });
  
  return details;
}

/**
 * Generate the complete CONTRACTS.md content
 */
function generateMarkdown(allContracts) {
  const timestamp = new Date().toISOString();

  let content = `# Deployed Contracts\n\n`;
  content += `> Auto-generated from Ignition deployment data\n\n`;
  content += `This document contains information about all smart contracts deployed across different networks using Hardhat Ignition.\n\n`;

  // Overview section
  content += `## Overview\n\n`;
  
  // Generate tables for each network
  Object.values(NETWORKS).forEach(networkConfig => {
    const networkContracts = allContracts.filter(c => c && c.chainId === networkConfig.chainId);
    
    content += `### ${networkConfig.name} (Chain ID: ${networkConfig.chainId})\n\n`;
    content += generateNetworkTable(networkConfig, networkContracts);
  });
  
  // Contract details
  const validContracts = allContracts.filter(c => c !== null);
  if (validContracts.length > 0) {
    content += generateContractDetails(validContracts);
  }
  
  // Footer
  content += `## Notes\n\n`;
  content += `- ✅ = Contract is verified on block explorer\n`;
  content += `- ❌ = Contract is not verified\n`;
  content += `- This file is auto-generated from Ignition deployment data\n`;
  content += `- To update this file, run: \`pnpm run generate:contracts-md\`\n\n`;
  content += `## Useful Links\n\n`;
  content += `- [World Chain Sepolia Explorer](https://worldchain-sepolia.explorer.alchemy.com)\n`;
  content += `- [World Chain Mainnet Explorer](https://worldchain-mainnet.explorer.alchemy.com)\n`;
  content += `- [Hardhat Ignition Documentation](https://hardhat.org/ignition)\n`;
  
  return content;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Generating CONTRACTS.md from Ignition deployments...');
  
  const allContracts = [];
  
  // Process each network
  for (const [chainId, networkConfig] of Object.entries(NETWORKS)) {
    console.log(`\n📡 Processing ${networkConfig.name} (Chain ID: ${chainId})`);
    
    // Read deployment addresses
    const addresses = readIgnitionAddresses(parseInt(chainId));
    const contractAddresses = Object.values(addresses);
    
    if (contractAddresses.length === 0) {
      console.log(`  No contracts found for ${networkConfig.name}`);
      continue;
    }
    
    console.log(`  Found ${contractAddresses.length} contracts`);
    
    // Fetch contract info from Blockscout
    console.log(`  Fetching contract info from Blockscout...`);
    const contractsInfo = await getMultipleContractsInfo(parseInt(chainId), contractAddresses);
    
    // Enhance with deployment info
    Object.entries(addresses).forEach(([moduleKey, address], index) => {
      const contractInfo = contractsInfo[index];
      if (contractInfo) {
        contractInfo.chainId = parseInt(chainId);
        contractInfo.networkName = networkConfig.name;
        contractInfo.deploymentModule = getDeploymentModule(moduleKey);
        contractInfo.name = parseContractName(moduleKey);
      }
    });
    
    allContracts.push(...contractsInfo);
    
    const verifiedCount = contractsInfo.filter(c => c && c.isVerified).length;
    console.log(`  ✅ ${verifiedCount}/${contractsInfo.length} contracts verified`);
  }
  
  // Generate markdown
  console.log('\n📝 Generating markdown content...');
  const markdownContent = generateMarkdown(allContracts);
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, markdownContent, 'utf8');
  
  console.log(`\n✅ CONTRACTS.md generated successfully!`);
  console.log(`📄 File saved to: ${OUTPUT_FILE}`);
  
  // Summary
  const totalContracts = allContracts.filter(c => c !== null).length;
  const verifiedContracts = allContracts.filter(c => c && c.isVerified).length;
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total contracts: ${totalContracts}`);
  console.log(`  Verified contracts: ${verifiedContracts}`);
  console.log(`  Verification rate: ${totalContracts > 0 ? Math.round((verifiedContracts / totalContracts) * 100) : 0}%`);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error generating CONTRACTS.md:', error);
    process.exit(1);
  });
}

module.exports = { main };
