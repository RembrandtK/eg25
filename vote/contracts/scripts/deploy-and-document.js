#!/usr/bin/env node

/**
 * Complete deployment and documentation workflow
 * 
 * This script orchestrates the entire deployment process:
 * 1. Deploy contracts using Ignition
 * 2. Sync frontend contracts
 * 3. Generate CONTRACTS.md documentation
 * 4. Optionally verify contracts on Blockscout
 * 
 * Usage: node scripts/deploy-and-document.js [--network <network>] [--verify]
 */

const { execSync } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const networkArg = args.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'worldchain-sepolia';
const shouldVerify = args.includes('--verify');
const skipSync = args.includes('--skip-sync');
const skipDocs = args.includes('--skip-docs');

// Network configurations
const NETWORKS = {
  'worldchain-sepolia': {
    deployScript: 'deploy:election:sepolia',
    verifyScript: 'verify:blockscout:sepolia',
    chainId: 4801
  },
  'worldchain-mainnet': {
    deployScript: 'deploy:ignition:mainnet',
    verifyScript: 'verify:blockscout',
    chainId: 480
  }
};

/**
 * Execute command with proper error handling
 */
function executeCommand(command, description, cwd = process.cwd()) {
  console.log(`\n🔄 ${description}...`);
  console.log(`📝 Command: ${command}`);
  
  try {
    const output = execSync(command, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

/**
 * Check if required tools are available
 */
function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  const checks = [
    { command: 'node --version', name: 'Node.js' },
    { command: 'npm --version', name: 'npm' }
  ];
  
  for (const check of checks) {
    try {
      execSync(check.command, { stdio: 'pipe' });
      console.log(`✅ ${check.name} is available`);
    } catch (error) {
      console.error(`❌ ${check.name} is not available`);
      return false;
    }
  }
  
  return true;
}

/**
 * Deploy contracts using Ignition
 */
function deployContracts(network) {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    console.error(`❌ Unsupported network: ${network}`);
    return false;
  }
  
  const command = `npm run ${networkConfig.deployScript}`;
  return executeCommand(command, `Deploying contracts to ${network}`);
}

/**
 * Sync frontend contracts
 */
function syncFrontendContracts() {
  const frontendDir = path.join(__dirname, '../../world-app');
  const command = 'npm run sync-contracts';
  return executeCommand(command, 'Syncing frontend contracts', frontendDir);
}

/**
 * Generate CONTRACTS.md documentation
 */
function generateDocumentation() {
  const command = 'node scripts/generate-contracts-md.js';
  return executeCommand(command, 'Generating CONTRACTS.md documentation');
}

/**
 * Verify contracts on Blockscout
 */
function verifyContracts(network) {
  const networkConfig = NETWORKS[network];
  if (!networkConfig) {
    console.error(`❌ Unsupported network: ${network}`);
    return false;
  }
  
  const command = `npm run ${networkConfig.verifyScript}`;
  return executeCommand(command, `Verifying contracts on ${network}`);
}

/**
 * Display deployment summary
 */
function displaySummary(network, results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`🌐 Network: ${network}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  console.log('\n📋 Results:');
  Object.entries(results).forEach(([step, success]) => {
    const icon = success ? '✅' : '❌';
    console.log(`  ${icon} ${step}`);
  });
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalSteps = Object.keys(results).length;
  
  console.log(`\n🎯 Success Rate: ${successCount}/${totalSteps} (${Math.round((successCount/totalSteps)*100)}%)`);
  
  if (successCount === totalSteps) {
    console.log('\n🎉 All steps completed successfully!');
  } else {
    console.log('\n⚠️  Some steps failed. Check the logs above for details.');
  }
  
  console.log('\n🔗 Useful Links:');
  if (network === 'worldchain-sepolia') {
    console.log('  📱 Frontend: http://localhost:3000');
    console.log('  🔍 Explorer: https://worldchain-sepolia.blockscout.com');
  } else if (network === 'worldchain-mainnet') {
    console.log('  🔍 Explorer: https://worldscan.org');
  }
  
  console.log('  📄 Documentation: ./CONTRACTS.md');
  console.log('  🔧 Contract Config: ../world-app/src/config/contracts.ts');
}

/**
 * Main workflow function
 */
async function main() {
  console.log('🚀 Starting deployment and documentation workflow...');
  console.log(`🌐 Target Network: ${networkArg}`);
  console.log(`🔍 Verify Contracts: ${shouldVerify ? 'Yes' : 'No'}`);
  
  // Check prerequisites
  if (!checkPrerequisites()) {
    console.error('❌ Prerequisites check failed. Please install required tools.');
    process.exit(1);
  }
  
  const results = {};
  
  // Step 1: Deploy contracts
  results['Contract Deployment'] = deployContracts(networkArg);
  
  // Step 2: Sync frontend contracts (unless skipped)
  if (!skipSync) {
    results['Frontend Sync'] = syncFrontendContracts();
  }
  
  // Step 3: Generate documentation (unless skipped)
  if (!skipDocs) {
    results['Documentation Generation'] = generateDocumentation();
  }
  
  // Step 4: Verify contracts (if requested)
  if (shouldVerify) {
    results['Contract Verification'] = verifyContracts(networkArg);
  }
  
  // Display summary
  displaySummary(networkArg, results);
  
  // Exit with appropriate code
  const allSuccessful = Object.values(results).every(Boolean);
  process.exit(allSuccessful ? 0 : 1);
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Workflow failed:', error);
    process.exit(1);
  });
}

module.exports = { main };
