#!/usr/bin/env node

/**
 * Direct API Test - Test contract reading without running the full frontend
 * This simulates what the voting-status API does
 */

const { createPublicClient, http } = require("viem");

// Configuration
const CONFIG = {
  electionManagerAddress: "0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7",
  peerRankingAddress: "0x2caDc553c4B98863A3937fF0E710b79F7E855d8a",
  rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  chainId: 4801,
  testUserAddress: "0x3c6c2348d430996285672346258afb8528086d5a"
};

// Worldchain Sepolia configuration
const worldchainSepolia = {
  id: 4801,
  name: "Worldchain Sepolia",
  rpcUrls: {
    default: { http: [CONFIG.rpcUrl] },
    public: { http: [CONFIG.rpcUrl] }
  }
};

// Minimal ABIs for testing
const ELECTION_ABI = [
  {
    "inputs": [],
    "name": "candidateCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCandidates",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "bool", "name": "active", "type": "bool"}
        ],
        "internalType": "struct IElectionManager.Candidate[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "votingActive",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalVotes",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

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
  }
];

async function testAPIFunctionality() {
  console.log("🧪 Testing API Functionality (Direct Contract Calls)");
  console.log("============================================================");
  console.log(`ElectionManager: ${CONFIG.electionManagerAddress}`);
  console.log(`PeerRanking: ${CONFIG.peerRankingAddress}`);
  console.log(`RPC: ${CONFIG.rpcUrl}`);
  console.log(`Test User: ${CONFIG.testUserAddress}`);
  console.log("");

  try {
    // Create Viem client
    console.log("🔗 Creating Viem client...");
    const client = createPublicClient({
      chain: worldchainSepolia,
      transport: http(),
    });

    // Test ElectionManager functions (like voting-status API does)
    console.log("📊 Testing ElectionManager functions...");
    
    const candidateCount = await client.readContract({
      address: CONFIG.electionManagerAddress,
      abi: ELECTION_ABI,
      functionName: "candidateCount",
    });
    console.log(`✅ Candidate count: ${candidateCount.toString()}`);

    const candidates = await client.readContract({
      address: CONFIG.electionManagerAddress,
      abi: ELECTION_ABI,
      functionName: "getCandidates",
    });
    console.log(`✅ Candidates loaded: ${candidates.length}`);

    const votingActive = await client.readContract({
      address: CONFIG.electionManagerAddress,
      abi: ELECTION_ABI,
      functionName: "votingActive",
    });
    console.log(`✅ Voting active: ${votingActive}`);

    const totalVotes = await client.readContract({
      address: CONFIG.electionManagerAddress,
      abi: ELECTION_ABI,
      functionName: "getTotalVotes",
    });
    console.log(`✅ Total votes: ${totalVotes.toString()}`);

    // Test PeerRanking functions (like voting-status API does)
    console.log("🗳️  Testing PeerRanking functions...");
    
    const totalRankers = await client.readContract({
      address: CONFIG.peerRankingAddress,
      abi: PEER_RANKING_ABI,
      functionName: "getTotalRankers",
    });
    console.log(`✅ Total rankers: ${totalRankers.toString()}`);

    const userRanking = await client.readContract({
      address: CONFIG.peerRankingAddress,
      abi: PEER_RANKING_ABI,
      functionName: "getUserRanking",
      args: [CONFIG.testUserAddress],
    });
    console.log(`✅ User ranking: [${userRanking.map(id => id.toString()).join(", ")}]`);

    // Simulate API response structure
    const apiResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      election: {
        candidateCount: Number(candidateCount),
        candidates: candidates.map(c => ({
          id: Number(c.id),
          name: c.name,
          description: c.description,
          active: c.active
        })),
        votingActive,
        totalVotes: Number(totalVotes)
      },
      peerRanking: {
        totalRankers: Number(totalRankers),
        userRanking: userRanking.map(id => Number(id)),
        hasUserRanking: userRanking.length > 0
      }
    };

    console.log("");
    console.log("🔍 API Response Structure Test:");
    console.log(JSON.stringify(apiResponse, null, 2));

    console.log("");
    console.log("🎉 SUCCESS: All contract reading functions working!");
    console.log("✅ ElectionManager contract accessible");
    console.log("✅ PeerRanking contract accessible");
    console.log("✅ API response structure correct");
    console.log("✅ Ready for frontend integration");

    return apiResponse;

  } catch (error) {
    console.log(`❌ API functionality test failed: ${error.message}`);
    console.log("");
    console.log("🔧 Troubleshooting:");
    console.log("1. Check contract addresses");
    console.log("2. Verify RPC connectivity");
    console.log("3. Check contract ABIs");
    console.log("4. Verify contract deployments");
    
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testAPIFunctionality()
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

module.exports = { testAPIFunctionality };
