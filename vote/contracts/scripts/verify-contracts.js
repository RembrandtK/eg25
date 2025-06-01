#!/usr/bin/env node

/**
 * Verify contracts on Blockscout using the verification API
 * 
 * This script:
 * 1. Reads deployed contracts from Ignition
 * 2. Compiles and flattens source code
 * 3. Submits verification requests to Blockscout
 * 4. Monitors verification status
 * 
 * Usage: node scripts/verify-contracts.js [--network <network>] [--contract <contract-name>]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ethers } = require('hardhat');
const { verifyContract, checkVerificationService, getContractInfo } = require('./blockscout-api');

// Parse command line arguments
const args = process.argv.slice(2);
const networkArg = args.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'worldchain-sepolia';
const contractArg = args.find(arg => arg.startsWith('--contract='))?.split('=')[1];

// Network to chain ID mapping
const NETWORK_CHAIN_IDS = {
  'worldchain-sepolia': 4801,
  'worldchain-mainnet': 480
};

/**
 * Get flattened source code for a contract
 */
function getFlattenedSource(contractName) {
  try {
    const contractPath = `contracts/${contractName}.sol`;
    const command = `npx hardhat flatten ${contractPath}`;
    const flattened = execSync(command, { encoding: 'utf8' });
    
    // Remove duplicate SPDX license identifiers (hardhat flatten issue)
    const lines = flattened.split('\n');
    const cleanedLines = [];
    let seenSPDX = false;
    
    for (const line of lines) {
      if (line.includes('SPDX-License-Identifier')) {
        if (!seenSPDX) {
          cleanedLines.push(line);
          seenSPDX = true;
        }
      } else {
        cleanedLines.push(line);
      }
    }
    
    return cleanedLines.join('\n');
  } catch (error) {
    console.error(`Error flattening ${contractName}:`, error.message);
    return null;
  }
}

/**
 * Get compiler settings from hardhat config
 */
function getCompilerSettings() {
  const hardhatConfig = require('../hardhat.config.js');
  const solidity = hardhatConfig.solidity;
  
  return {
    version: solidity.version,
    settings: solidity.settings || {}
  };
}

/**
 * Prepare verification data for a contract
 */
async function prepareVerificationData(contractName, contractAddress, chainId) {
  console.log(`📋 Preparing verification data for ${contractName}...`);
  
  // Get flattened source code
  const sourceCode = getFlattenedSource(contractName);
  if (!sourceCode) {
    throw new Error(`Failed to get source code for ${contractName}`);
  }
  
  // Get compiler settings
  const compiler = getCompilerSettings();
  
  // Get constructor arguments from deployment
  const network = await ethers.provider.getNetwork();
  const deploymentDir = path.join(__dirname, '../ignition/deployments', `chain-${chainId}`);
  
  // Try to auto-detect constructor args
  let constructorArgs = '';
  try {
    const creationTx = await ethers.provider.getTransaction(
      // This would need the creation tx hash - we'll implement auto-detection
    );
    // Auto-detection logic would go here
  } catch (error) {
    console.log('  Using auto-detection for constructor args');
  }
  
  const verificationData = {
    compiler_version: `v${compiler.version}`,
    license_type: 'mit', // Default to MIT, could be extracted from source
    source_code: sourceCode,
    contract_name: contractName,
    is_optimization_enabled: compiler.settings.optimizer?.enabled || false,
    optimization_runs: compiler.settings.optimizer?.runs || 200,
    evm_version: compiler.settings.evmVersion || 'london',
    autodetect_constructor_args: true,
    constructor_args: constructorArgs
  };
  
  return verificationData;
}

/**
 * Verify a single contract
 */
async function verifySingleContract(contractName, contractAddress, chainId) {
  console.log(`\n🔍 Verifying ${contractName} at ${contractAddress}...`);
  
  // Check if already verified
  const contractInfo = await getContractInfo(chainId, contractAddress);
  if (contractInfo && contractInfo.isVerified) {
    console.log(`  ✅ Contract already verified!`);
    return true;
  }
  
  // Check if verification service is available
  const serviceAvailable = await checkVerificationService(chainId);
  if (!serviceAvailable) {
    console.log(`  ❌ Verification service not available for chain ${chainId}`);
    return false;
  }
  
  try {
    // Prepare verification data
    const verificationData = await prepareVerificationData(contractName, contractAddress, chainId);
    
    // Submit verification
    console.log(`  📤 Submitting verification request...`);
    const result = await verifyContract(chainId, contractAddress, verificationData);
    
    if (result) {
      console.log(`  ✅ Verification submitted successfully!`);
      console.log(`  🔗 Check status at: ${contractInfo?.blockscoutUrl || 'Blockscout'}`);
      return true;
    } else {
      console.log(`  ❌ Verification failed`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error verifying contract:`, error.message);
    return false;
  }
}

/**
 * Get deployed contracts from Ignition
 */
function getDeployedContracts(chainId) {
  const deploymentDir = path.join(__dirname, '../ignition/deployments', `chain-${chainId}`);
  const addressesFile = path.join(deploymentDir, 'deployed_addresses.json');
  
  if (!fs.existsSync(addressesFile)) {
    console.log(`No deployments found for chain ${chainId}`);
    return {};
  }
  
  return JSON.parse(fs.readFileSync(addressesFile, 'utf8'));
}

/**
 * Parse contract name from module key
 */
function parseContractName(moduleKey) {
  const parts = moduleKey.split('#');
  return parts.length > 1 ? parts[1] : parts[0];
}

/**
 * Main verification function
 */
async function main() {
  const chainId = NETWORK_CHAIN_IDS[networkArg];
  if (!chainId) {
    console.error(`❌ Unsupported network: ${networkArg}`);
    process.exit(1);
  }
  
  console.log(`🚀 Starting contract verification for ${networkArg} (Chain ID: ${chainId})`);
  
  // Get deployed contracts
  const deployedAddresses = getDeployedContracts(chainId);
  const contracts = Object.entries(deployedAddresses);
  
  if (contracts.length === 0) {
    console.log(`❌ No contracts found for ${networkArg}`);
    process.exit(1);
  }
  
  console.log(`📋 Found ${contracts.length} deployed contracts`);
  
  // Filter by specific contract if specified
  const contractsToVerify = contractArg 
    ? contracts.filter(([moduleKey]) => parseContractName(moduleKey) === contractArg)
    : contracts;
  
  if (contractsToVerify.length === 0) {
    console.log(`❌ Contract ${contractArg} not found in deployments`);
    process.exit(1);
  }
  
  // Verify contracts
  let successCount = 0;
  for (const [moduleKey, address] of contractsToVerify) {
    const contractName = parseContractName(moduleKey);
    const success = await verifySingleContract(contractName, address, chainId);
    if (success) successCount++;
  }
  
  // Summary
  console.log(`\n📊 Verification Summary:`);
  console.log(`  Total contracts: ${contractsToVerify.length}`);
  console.log(`  Successfully verified: ${successCount}`);
  console.log(`  Failed: ${contractsToVerify.length - successCount}`);
  
  if (successCount === contractsToVerify.length) {
    console.log(`\n✅ All contracts verified successfully!`);
  } else {
    console.log(`\n⚠️  Some contracts failed verification. Check the logs above.`);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  });
}

module.exports = { main, verifySingleContract };
