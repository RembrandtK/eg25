#!/usr/bin/env node

/**
 * Simple Contract Connection Test
 * Tests if the frontend can connect to the deployed contract
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
  contractAddress: addresses.electionManager, // Test ElectionManager contract
  rpcUrls: [
    "https://worldchain-sepolia.g.alchemy.com/public",
    "https://worldchain-sepolia.gateway.tenderly.co",
    "https://rpc.worldchain-sepolia.org"
  ],
  chainId: 4801
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

// Minimal Election ABI for testing
const ELECTION_ABI = [
  {
    "inputs": [],
    "name": "getCandidates",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "bool", "name": "active", "type": "bool" }
        ],
        "internalType": "struct ElectionManager.Candidate[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "candidateCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "votingActive",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testContractConnection() {
  console.log("🧪 Testing Contract Connection from Frontend Perspective");
  console.log("=" .repeat(60));
  console.log(`Contract: ${CONFIG.contractAddress}`);
  console.log(`Network: Worldchain Sepolia (${CONFIG.chainId})`);
  console.log(`RPC: ${CONFIG.rpcUrl}`);
  console.log("");

  try {
    // Create client exactly like the frontend does
    const client = createPublicClient({
      chain: worldchainSepolia,
      transport: http(CONFIG.rpcUrl)
    });

    console.log("🔗 Creating Viem client...");

    // Test 1: Basic contract call
    console.log("📊 Testing candidateCount()...");
    const candidateCount = await client.readContract({
      address: CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "candidateCount"
    });
    console.log(`✅ Candidate count: ${candidateCount}`);

    // Test 2: Get candidates (the main frontend call)
    console.log("👥 Testing getCandidates()...");
    const candidates = await client.readContract({
      address: CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "getCandidates",
      args: []
    });

    console.log(`✅ getCandidates() returned ${candidates.length} candidates:`);
    candidates.forEach((candidate, index) => {
      console.log(`   ${index + 1}. ${candidate.name} - ${candidate.description}`);
      console.log(`      ID: ${candidate.id}, Active: ${candidate.active}`);
    });

    // Test 3: Voting status
    console.log("🗳️  Testing votingActive()...");
    const votingActive = await client.readContract({
      address: CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "votingActive"
    });
    console.log(`✅ Voting active: ${votingActive}`);

    // Validation
    console.log("");
    console.log("🔍 Validation:");

    if (Number(candidateCount) !== candidates.length) {
      console.log(`❌ Mismatch: candidateCount=${candidateCount}, getCandidates length=${candidates.length}`);
      return false;
    }
    console.log(`✅ Candidate count matches array length`);

    if (candidates.length === 0) {
      console.log(`❌ No candidates found`);
      return false;
    }
    console.log(`✅ Candidates found: ${candidates.length}`);

    const expectedCandidates = ["Alice Johnson", "Bob Smith", "Carol Davis", "David Wilson"];
    const actualNames = candidates.map(c => c.name);

    for (const expectedName of expectedCandidates) {
      if (!actualNames.includes(expectedName)) {
        console.log(`❌ Missing expected candidate: ${expectedName}`);
        return false;
      }
    }
    console.log(`✅ All expected candidates present`);

    console.log("");
    console.log("🎉 SUCCESS: Contract connection working perfectly!");
    console.log("✅ Frontend should be able to load candidates");
    console.log("✅ All contract functions accessible");
    console.log("✅ Data structure is correct");

    return true;

  } catch (error) {
    console.log("");
    console.log("❌ FAILED: Contract connection error");
    console.log(`Error: ${error.message}`);

    if (error.message.includes("returned no data")) {
      console.log("");
      console.log("🔧 Troubleshooting:");
      console.log("- Check if contract is deployed to the correct network");
      console.log("- Verify contract address is correct");
      console.log("- Ensure RPC URL is accessible");
    }

    console.log(`Stack: ${error.stack}`);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testContractConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error("💥 Test script failed:", error);
      process.exit(1);
    });
}

module.exports = { testContractConnection };
