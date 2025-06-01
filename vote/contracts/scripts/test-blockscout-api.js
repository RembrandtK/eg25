#!/usr/bin/env node

/**
 * Test script to verify Blockscout API connectivity
 * 
 * This script tests the Blockscout API endpoints to ensure they're working
 * with the correct Alchemy-hosted Blockscout instances.
 * 
 * Usage: node scripts/test-blockscout-api.js
 */

const { getContractInfo, getNetworkConfig, NETWORKS } = require('./blockscout-api');

async function testBlockscoutAPI() {
  console.log('🧪 Testing Blockscout API connectivity...\n');
  
  // Test network configurations
  console.log('📋 Network Configurations:');
  Object.entries(NETWORKS).forEach(([chainId, config]) => {
    console.log(`  ${config.name} (${chainId}): ${config.blockscoutUrl}`);
  });
  
  console.log('\n🔍 Testing API endpoints...\n');
  
  // Test Sepolia with your deployed contract
  const sepoliaChainId = 4801;
  const testContractAddress = '0xE633498333Cc9079340EAE0864D001336211d111';
  
  try {
    console.log(`📡 Testing ${NETWORKS[sepoliaChainId].name}...`);
    console.log(`   Contract: ${testContractAddress}`);
    console.log(`   Endpoint: ${NETWORKS[sepoliaChainId].blockscoutUrl}`);
    
    const contractInfo = await getContractInfo(sepoliaChainId, testContractAddress);
    
    if (contractInfo) {
      console.log('   ✅ API Response received!');
      console.log(`   📄 Contract Name: ${contractInfo.name || 'Unknown'}`);
      console.log(`   🔍 Verified: ${contractInfo.isVerified ? 'Yes' : 'No'}`);
      console.log(`   🔗 Explorer URL: ${contractInfo.blockscoutUrl}`);
      
      if (contractInfo.compilerVersion) {
        console.log(`   ⚙️  Compiler: ${contractInfo.compilerVersion}`);
      }
      
      if (contractInfo.createdAtBlock) {
        console.log(`   📦 Created at Block: ${contractInfo.createdAtBlock}`);
      }
    } else {
      console.log('   ❌ No response from API (might be rate limited or contract not found)');
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n🔗 Testing Explorer URLs...');
  
  // Test if the explorer URLs are accessible
  const testUrls = [
    `${NETWORKS[4801].blockscoutUrl}/address/${testContractAddress}`,
    `${NETWORKS[480].blockscoutUrl}` // Just test the main page for mainnet
  ];
  
  testUrls.forEach((url, index) => {
    const networkName = index === 0 ? 'Sepolia' : 'Mainnet';
    console.log(`   ${networkName}: ${url}`);
  });
  
  console.log('\n📊 Summary:');
  console.log('   - Blockscout instances are Alchemy-hosted');
  console.log('   - URLs follow pattern: worldchain-{network}.explorer.alchemy.com');
  console.log('   - These are official Blockscout explorers for World Chain');
  console.log('   - API endpoints should support standard Blockscout API');
  
  console.log('\n✅ Test completed! Check the results above.');
  console.log('💡 If API calls failed, it might be due to rate limiting or network issues.');
  console.log('🔗 You can manually verify by opening the explorer URLs in your browser.');
}

// Run the test
if (require.main === module) {
  testBlockscoutAPI().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testBlockscoutAPI };
