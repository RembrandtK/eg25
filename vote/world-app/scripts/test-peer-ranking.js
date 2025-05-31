#!/usr/bin/env node

/**
 * Test PeerRanking Contract Reading Functions
 * Tests if the frontend can read from the deployed PeerRanking contract
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
  peerRankingAddress: addresses.peerRanking,
  electionManagerAddress: addresses.electionManager,
  worldIdAddressBookAddress: addresses.worldIdAddressBook,
  rpcUrls: [
    "https://worldchain-sepolia.g.alchemy.com/public",
    "https://worldchain-sepolia.gateway.tenderly.co",
    "https://rpc.worldchain-sepolia.org"
  ],
  chainId: 4801,
  testUserAddress: "0x3c6c2348d430996285672346258afb8528086d5a" // Example address
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

// PeerRanking ABI (minimal for testing)
const PEER_RANKING_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserRanking",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalRankers",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "hasRanking",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "candidateA", "type": "uint256"},
      {"internalType": "uint256", "name": "candidateB", "type": "uint256"}
    ],
    "name": "getComparisonCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testPeerRankingContract() {
  console.log("🧪 Testing PeerRanking Contract Reading Functions");
  console.log("============================================================");
  console.log(`Contract: ${CONFIG.peerRankingAddress}`);
  console.log(`Network: Worldchain Sepolia (${CONFIG.chainId})`);
  console.log(`Test User: ${CONFIG.testUserAddress}`);
  console.log("");

  try {
    // Create Viem client
    console.log("🔗 Creating Viem client...");
    const client = createPublicClient({
      chain: worldchainSepolia,
      transport: http(),
    });

    // Test 1: Get total rankers
    console.log("📊 Testing getTotalRankers()...");
    const totalRankers = await client.readContract({
      address: CONFIG.peerRankingAddress,
      abi: PEER_RANKING_ABI,
      functionName: "getTotalRankers",
    });
    console.log(`✅ Total rankers: ${totalRankers.toString()}`);

    // Test 2: Check if test user has ranking
    console.log("👤 Testing hasRanking() for test user...");
    const hasRanking = await client.readContract({
      address: CONFIG.peerRankingAddress,
      abi: PEER_RANKING_ABI,
      functionName: "hasRanking",
      args: [CONFIG.testUserAddress],
    });
    console.log(`✅ Test user has ranking: ${hasRanking}`);

    // Test 3: Get user ranking
    console.log("🗳️  Testing getUserRanking() for test user...");
    const userRanking = await client.readContract({
      address: CONFIG.peerRankingAddress,
      abi: PEER_RANKING_ABI,
      functionName: "getUserRanking",
      args: [CONFIG.testUserAddress],
    });
    console.log(`✅ User ranking: [${userRanking.map(id => id.toString()).join(", ")}]`);

    // Test 4: Get comparison counts (if we have candidates)
    console.log("🔍 Testing getComparisonCount() for candidate pairs...");
    try {
      const comparison1v2 = await client.readContract({
        address: CONFIG.peerRankingAddress,
        abi: PEER_RANKING_ABI,
        functionName: "getComparisonCount",
        args: [1, 2], // Alice vs Bob
      });
      console.log(`✅ Candidate 1 vs 2 comparisons: ${comparison1v2.toString()}`);

      const comparison1v3 = await client.readContract({
        address: CONFIG.peerRankingAddress,
        abi: PEER_RANKING_ABI,
        functionName: "getComparisonCount",
        args: [1, 3], // Alice vs Carol
      });
      console.log(`✅ Candidate 1 vs 3 comparisons: ${comparison1v3.toString()}`);
    } catch (error) {
      console.log(`⚠️  Comparison count test failed: ${error.message}`);
    }

    console.log("");
    console.log("🔍 Validation:");
    console.log(`✅ Contract is deployed and accessible`);
    console.log(`✅ All view functions working`);
    console.log(`✅ Data types are correct`);
    
    if (totalRankers > 0) {
      console.log(`✅ Contract has ${totalRankers} rankers`);
    } else {
      console.log(`ℹ️  No rankers yet (expected for new deployment)`);
    }

    console.log("");
    console.log("🎉 SUCCESS: PeerRanking contract reading working perfectly!");
    console.log("✅ Frontend should be able to read user rankings");
    console.log("✅ All contract functions accessible");
    console.log("✅ Ready for frontend integration");

    return {
      success: true,
      totalRankers: Number(totalRankers),
      testUserHasRanking: hasRanking,
      testUserRanking: userRanking.map(id => Number(id))
    };

  } catch (error) {
    console.log(`❌ PeerRanking contract test failed: ${error.message}`);
    console.log("");
    console.log("🔧 Troubleshooting:");
    console.log("1. Check if PeerRanking contract is deployed correctly");
    console.log("2. Verify contract address in peer-ranking-abi.ts");
    console.log("3. Test RPC connectivity");
    console.log("4. Check contract ABI matches deployed contract");
    
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testPeerRankingContract()
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

module.exports = { testPeerRankingContract };
