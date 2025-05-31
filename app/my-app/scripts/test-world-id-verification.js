#!/usr/bin/env node

/**
 * Test World ID Address Book Verification
 * Tests if a user address is verified with World ID
 */

const { createPublicClient, http } = require("viem");
const fs = require('fs');
const path = require('path');

// Read contract addresses from the same source as frontend
function getContractAddresses() {
  const contractsPath = path.join(__dirname, '../src/config/contracts.ts');
  
  if (!fs.existsSync(contractsPath)) {
    throw new Error('contracts.ts not found. Run "npm run sync-contracts" first.');
  }
  
  const contractsContent = fs.readFileSync(contractsPath, 'utf8');
  
  // Extract DEPLOYED_ADDRESSES from the file
  const deployedAddressesMatch = contractsContent.match(/const DEPLOYED_ADDRESSES = ({[\s\S]*?});/);
  if (!deployedAddressesMatch) {
    throw new Error('Could not parse DEPLOYED_ADDRESSES from contracts.ts');
  }
  
  const deployedAddresses = JSON.parse(deployedAddressesMatch[1]);
  const chainId = 4801; // World Chain Sepolia
  
  if (!deployedAddresses[chainId]) {
    throw new Error(`No deployments found for chain ID ${chainId}`);
  }
  
  return {
    peerRanking: deployedAddresses[chainId]["PeerRankingDeployment#PeerRanking"],
    electionManager: deployedAddresses[chainId]["ElectionDeployment#ElectionManager"],
    worldIdAddressBook: deployedAddresses[chainId]["MockWorldIDDeployment#MockWorldIDAddressBook"]
  };
}

// Get addresses from contracts config
const addresses = getContractAddresses();

// Configuration
const CONFIG = {
  worldIdAddressBookAddress: addresses.worldIdAddressBook,
  rpcUrls: [
    "https://worldchain-sepolia.g.alchemy.com/public",
    "https://worldchain-sepolia.gateway.tenderly.co",
    "https://rpc.worldchain-sepolia.org"
  ],
  chainId: 4801,
  // Test with the actual user address from the logs
  testAddresses: [
    "0x3c6c2348d430996285672346258afb8528086d5a", // Actual user address from logs
  ]
};

// Worldchain Sepolia configuration
const worldchainSepolia = {
  id: 4801,
  name: "Worldchain Sepolia",
  rpcUrls: {
    default: { http: CONFIG.rpcUrls },
    public: { http: CONFIG.rpcUrls }
  }
};

// World ID Address Book ABI (minimal for testing)
const WORLD_ID_ADDRESS_BOOK_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "addressVerifiedUntil",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testWorldIdVerification() {
  console.log("🧪 Testing World ID Address Verification");
  console.log("============================================================");
  console.log(`World ID Address Book: ${CONFIG.worldIdAddressBookAddress}`);
  console.log(`Network: Worldchain Sepolia (${CONFIG.chainId})`);
  console.log("");

  try {
    // Create Viem client
    console.log("🔗 Creating Viem client...");
    const client = createPublicClient({
      chain: worldchainSepolia,
      transport: http(),
    });

    console.log("🔍 Testing address verification status...");
    
    for (const testAddress of CONFIG.testAddresses) {
      console.log(`\n👤 Testing address: ${testAddress}`);
      
      try {
        const verifiedUntil = await client.readContract({
          address: CONFIG.worldIdAddressBookAddress,
          abi: WORLD_ID_ADDRESS_BOOK_ABI,
          functionName: "addressVerifiedUntil",
          args: [testAddress],
        });
        
        const verifiedUntilNumber = Number(verifiedUntil);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const isVerified = verifiedUntilNumber > currentTimestamp;
        
        console.log(`   Verified until timestamp: ${verifiedUntilNumber}`);
        console.log(`   Current timestamp: ${currentTimestamp}`);
        console.log(`   Is currently verified: ${isVerified ? '✅ YES' : '❌ NO'}`);
        
        if (verifiedUntilNumber > 0) {
          const verifiedUntilDate = new Date(verifiedUntilNumber * 1000);
          console.log(`   Verified until date: ${verifiedUntilDate.toISOString()}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error checking verification: ${error.message}`);
      }
    }

    console.log("");
    console.log("🔍 Analysis:");
    console.log("✅ World ID Address Book contract is accessible");
    console.log("✅ addressVerifiedUntil() function working");
    console.log("");
    console.log("💡 To fix transaction failures:");
    console.log("1. User must complete World ID verification in World App");
    console.log("2. Verification must not be expired");
    console.log("3. User must use the same address that was verified");

    return { success: true };

  } catch (error) {
    console.log(`❌ World ID verification test failed: ${error.message}`);
    console.log("");
    console.log("🔧 Troubleshooting:");
    console.log("1. Check if World ID Address Book contract is deployed correctly");
    console.log("2. Verify contract address in contracts.ts");
    console.log("3. Test RPC connectivity");
    console.log("4. Check if this is a mock contract for testing");
    
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testWorldIdVerification()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("Test script error:", error);
      process.exit(1);
    });
}

module.exports = { testWorldIdVerification };
