const { createPublicClient, http } = require('viem');
const { worldchainSepolia } = require('viem/chains');

// Test the ACTUAL contract calls to see what data structure is returned
async function testRealContractCalls() {
  console.log("🧪 Testing REAL contract calls...");
  
  // Use the same RPC URL as the app
  const rpcUrl = process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC || 'https://worldchain-sepolia.g.alchemy.com/public';
  console.log("🔧 Using RPC URL:", rpcUrl);
  
  const publicClient = createPublicClient({
    chain: worldchainSepolia,
    transport: http(rpcUrl)
  });

  // Test 1: Check what getAllElections() actually returns
  try {
    console.log("\n📋 Testing getAllElections()...");
    
    const electionManagerAddress = "0x046B7CDb0DACE9d4c0B5396f34d47945e974E369"; // From deployment
    
    // Import the ABI (simplified for testing)
    const ELECTION_MANAGER_ABI = [
      {
        "inputs": [],
        "name": "getAllElections",
        "outputs": [
          {
            "components": [
              {"internalType": "uint256", "name": "id", "type": "uint256"},
              {"internalType": "string", "name": "title", "type": "string"},
              {"internalType": "string", "name": "description", "type": "string"},
              {"internalType": "string", "name": "worldIdAction", "type": "string"},
              {"internalType": "address", "name": "creator", "type": "address"},
              {"internalType": "address", "name": "electionAddress", "type": "address"},
              {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
              {"internalType": "bool", "name": "active", "type": "bool"}
            ],
            "internalType": "struct ElectionManager.ElectionInfo[]",
            "name": "",
            "type": "tuple[]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    const allElections = await publicClient.readContract({
      address: electionManagerAddress,
      abi: ELECTION_MANAGER_ABI,
      functionName: 'getAllElections',
    });

    console.log("✅ getAllElections() SUCCESS!");
    console.log("📊 Number of elections:", allElections.length);
    console.log("🔍 Raw result type:", typeof allElections);
    console.log("🔍 Is array:", Array.isArray(allElections));
    
    if (allElections.length > 0) {
      console.log("\n🔍 First election analysis:");
      const firstElection = allElections[0];
      console.log("  Type:", typeof firstElection);
      console.log("  Is array:", Array.isArray(firstElection));
      console.log("  Keys (if object):", Object.keys(firstElection || {}));
      console.log("  Length (if array):", firstElection?.length);
      console.log("  Raw data:", firstElection);
      
      // Test both access patterns
      console.log("\n🧪 Testing access patterns:");
      console.log("  Object access - firstElection.title:", firstElection.title);
      console.log("  Object access - firstElection.electionAddress:", firstElection.electionAddress);
      console.log("  Array access - firstElection[1]:", firstElection[1]);
      console.log("  Array access - firstElection[5]:", firstElection[5]);
    }

  } catch (error) {
    console.error("❌ getAllElections() FAILED:", error.message);
  }

  // Test 2: Check what candidates() returns for a known election
  try {
    console.log("\n🗳️ Testing candidates() call...");
    
    const electionAddress = "0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83";
    
    const ELECTION_ABI = [
      {
        "inputs": [],
        "name": "candidateCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "candidates",
        "outputs": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "bool", "name": "active", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    const candidateCount = await publicClient.readContract({
      address: electionAddress,
      abi: ELECTION_ABI,
      functionName: 'candidateCount',
    });

    console.log("✅ candidateCount() SUCCESS:", candidateCount.toString());

    if (Number(candidateCount) > 0) {
      const firstCandidate = await publicClient.readContract({
        address: electionAddress,
        abi: ELECTION_ABI,
        functionName: 'candidates',
        args: [BigInt(1)],
      });

      console.log("\n🔍 First candidate analysis:");
      console.log("  Type:", typeof firstCandidate);
      console.log("  Is array:", Array.isArray(firstCandidate));
      console.log("  Keys (if object):", Object.keys(firstCandidate || {}));
      console.log("  Length (if array):", firstCandidate?.length);
      console.log("  Raw data:", firstCandidate);
      
      console.log("\n🧪 Testing candidate access patterns:");
      console.log("  Object access - firstCandidate.name:", firstCandidate.name);
      console.log("  Object access - firstCandidate.description:", firstCandidate.description);
      console.log("  Array access - firstCandidate[1]:", firstCandidate[1]);
      console.log("  Array access - firstCandidate[2]:", firstCandidate[2]);
    }

  } catch (error) {
    console.error("❌ candidates() FAILED:", error.message);
  }

  console.log("\n🏁 Contract testing complete!");
}

// Run the test
testRealContractCalls().catch(console.error);
