#!/usr/bin/env node

/**
 * Contract Analytics using Blockscout API
 * 
 * This script demonstrates additional Blockscout API capabilities:
 * - Transaction analysis
 * - Event monitoring
 * - Usage statistics
 * - Contract interaction patterns
 * 
 * Usage: node scripts/contract-analytics.js [--contract <address>] [--network <network>]
 */

const { getContractInfo, getNetworkConfig, makeBlockscoutRequest } = require('./blockscout-api');

// Parse command line arguments
const args = process.argv.slice(2);
const contractArg = args.find(arg => arg.startsWith('--contract='))?.split('=')[1];
const networkArg = args.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'worldchain-sepolia';

// Network to chain ID mapping
const NETWORK_CHAIN_IDS = {
  'worldchain-sepolia': 4801,
  'worldchain-mainnet': 480
};

/**
 * Get contract transactions with pagination
 */
async function getContractTransactions(chainId, contractAddress, limit = 50) {
  const network = getNetworkConfig(chainId);
  const url = `${network.blockscoutUrl}/api/v2/addresses/${contractAddress}/transactions`;
  
  const data = await makeBlockscoutRequest(url, {
    params: {
      filter: 'to', // Only transactions TO this contract
      limit: limit
    }
  });
  
  return data?.items || [];
}

/**
 * Get contract token transfers
 */
async function getContractTokenTransfers(chainId, contractAddress) {
  const network = getNetworkConfig(chainId);
  const url = `${network.blockscoutUrl}/api/v2/addresses/${contractAddress}/token-transfers`;
  
  const data = await makeBlockscoutRequest(url);
  return data?.items || [];
}

/**
 * Get contract logs/events
 */
async function getContractLogs(chainId, contractAddress) {
  const network = getNetworkConfig(chainId);
  const url = `${network.blockscoutUrl}/api/v2/addresses/${contractAddress}/logs`;
  
  const data = await makeBlockscoutRequest(url);
  return data?.items || [];
}

/**
 * Analyze transaction patterns
 */
function analyzeTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      totalTransactions: 0,
      uniqueUsers: 0,
      averageGasUsed: 0,
      methodCalls: {},
      timePattern: {}
    };
  }
  
  const uniqueUsers = new Set();
  let totalGasUsed = 0;
  const methodCalls = {};
  const timePattern = {};
  
  transactions.forEach(tx => {
    // Track unique users
    if (tx.from) {
      uniqueUsers.add(tx.from.hash);
    }
    
    // Track gas usage
    if (tx.gas_used) {
      totalGasUsed += parseInt(tx.gas_used);
    }
    
    // Track method calls
    if (tx.method) {
      methodCalls[tx.method] = (methodCalls[tx.method] || 0) + 1;
    }
    
    // Track time patterns (by hour)
    if (tx.timestamp) {
      const hour = new Date(tx.timestamp).getHours();
      timePattern[hour] = (timePattern[hour] || 0) + 1;
    }
  });
  
  return {
    totalTransactions: transactions.length,
    uniqueUsers: uniqueUsers.size,
    averageGasUsed: Math.round(totalGasUsed / transactions.length),
    methodCalls,
    timePattern,
    mostActiveHour: Object.entries(timePattern).reduce((a, b) => timePattern[a[0]] > timePattern[b[0]] ? a : b)?.[0]
  };
}

/**
 * Generate analytics report
 */
function generateReport(contractInfo, transactions, analytics) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONTRACT ANALYTICS REPORT');
  console.log('='.repeat(60));
  
  // Basic contract info
  console.log('\n📋 Contract Information:');
  console.log(`  Name: ${contractInfo.name}`);
  console.log(`  Address: ${contractInfo.address}`);
  console.log(`  Network: ${contractInfo.networkName}`);
  console.log(`  Verified: ${contractInfo.isVerified ? 'Yes' : 'No'}`);
  console.log(`  Compiler: ${contractInfo.compilerVersion || 'Unknown'}`);
  
  // Transaction analytics
  console.log('\n📈 Transaction Analytics:');
  console.log(`  Total Transactions: ${analytics.totalTransactions}`);
  console.log(`  Unique Users: ${analytics.uniqueUsers}`);
  console.log(`  Average Gas Used: ${analytics.averageGasUsed.toLocaleString()}`);
  
  if (analytics.mostActiveHour) {
    console.log(`  Most Active Hour: ${analytics.mostActiveHour}:00`);
  }
  
  // Method calls
  if (Object.keys(analytics.methodCalls).length > 0) {
    console.log('\n🔧 Method Calls:');
    Object.entries(analytics.methodCalls)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([method, count]) => {
        console.log(`  ${method}: ${count} calls`);
      });
  }
  
  // Recent transactions
  if (transactions.length > 0) {
    console.log('\n🕒 Recent Transactions:');
    transactions.slice(0, 5).forEach(tx => {
      const timestamp = new Date(tx.timestamp).toLocaleString();
      const method = tx.method || 'Unknown';
      const gasUsed = tx.gas_used ? parseInt(tx.gas_used).toLocaleString() : 'Unknown';
      console.log(`  ${timestamp} | ${method} | Gas: ${gasUsed}`);
    });
  }
  
  console.log('\n🔗 Links:');
  console.log(`  Block Explorer: ${contractInfo.blockscoutUrl}`);
  console.log(`  Transactions: ${contractInfo.blockscoutUrl}/transactions`);
  console.log(`  Events: ${contractInfo.blockscoutUrl}/logs`);
}

/**
 * Main analytics function
 */
async function main() {
  const chainId = NETWORK_CHAIN_IDS[networkArg];
  if (!chainId) {
    console.error(`❌ Unsupported network: ${networkArg}`);
    process.exit(1);
  }
  
  if (!contractArg) {
    console.error('❌ Contract address is required. Use --contract=<address>');
    console.log('\nUsage: node scripts/contract-analytics.js --contract=0x... [--network=worldchain-sepolia]');
    process.exit(1);
  }
  
  console.log(`🔍 Analyzing contract ${contractArg} on ${networkArg}...`);
  
  try {
    // Get contract information
    console.log('📋 Fetching contract information...');
    const contractInfo = await getContractInfo(chainId, contractArg);
    
    if (!contractInfo) {
      console.error('❌ Contract not found or API unavailable');
      process.exit(1);
    }
    
    contractInfo.networkName = getNetworkConfig(chainId).name;
    
    // Get transaction data
    console.log('📈 Fetching transaction data...');
    const transactions = await getContractTransactions(chainId, contractArg, 100);
    
    // Analyze data
    console.log('🔬 Analyzing patterns...');
    const analytics = analyzeTransactions(transactions);
    
    // Generate report
    generateReport(contractInfo, transactions, analytics);
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    process.exit(1);
  }
}

// Example usage function
function showExamples() {
  console.log('📚 Example Usage:');
  console.log('');
  console.log('# Analyze a specific contract on Sepolia');
  console.log('node scripts/contract-analytics.js --contract=0xE633498333Cc9079340EAE0864D001336211d111 --network=worldchain-sepolia');
  console.log('');
  console.log('# Analyze on mainnet');
  console.log('node scripts/contract-analytics.js --contract=0x... --network=worldchain-mainnet');
  console.log('');
  console.log('Available networks: worldchain-sepolia, worldchain-mainnet');
}

// Handle help flag
if (args.includes('--help') || args.includes('-h')) {
  showExamples();
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Analytics failed:', error);
    process.exit(1);
  });
}

module.exports = { main, analyzeTransactions };
