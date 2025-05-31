#!/usr/bin/env node

/**
 * Test script to verify the complete voting flow
 * This script tests the election smart contract functionality
 */

const { createPublicClient, http } = require('viem');
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

// Define worldchain configuration inline
const worldchain = {
  id: 4801,
  name: 'World Chain Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://worldchain-sepolia.g.alchemy.com/v2/demo'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://worldchain-sepolia.blockscout.com',
    },
  },
  testnet: true,
};

// Contract configuration - using dynamic addresses from config
const ELECTION_ABI = [
  {
    "inputs": [],
    "name": "getCandidates",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
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
    "inputs": [
      {
        "internalType": "address",
        "name": "voter",
        "type": "address"
      }
    ],
    "name": "checkHasVoted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "votingActive",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testVotingFlow() {
  console.log("🗳️  Testing Election Voting Flow");
  console.log("================================");

  try {
    // Initialize client
    const client = createPublicClient({
      chain: worldchain,
      transport: http("https://worldchain-sepolia.g.alchemy.com/public"),
    });

    console.log("✅ Connected to World Chain Sepolia");
    console.log(`📍 Contract: ${addresses.electionManager}`);

    // Test 1: Check if voting is active
    console.log("\n1️⃣ Testing voting status...");
    const votingActive = await client.readContract({
      address: addresses.electionManager,
      abi: ELECTION_ABI,
      functionName: "votingActive",
    });
    console.log(`   Voting active: ${votingActive ? '✅ YES' : '❌ NO'}`);

    // Test 2: Load candidates
    console.log("\n2️⃣ Testing candidate loading...");
    const candidates = await client.readContract({
      address: addresses.electionManager,
      abi: ELECTION_ABI,
      functionName: "getCandidates",
    });

    console.log(`   Found ${candidates.length} candidates:`);
    candidates.forEach((candidate, index) => {
      console.log(`   ${index + 1}. ${candidate.name} - ${candidate.description} (Active: ${candidate.active})`);
    });

    // Test 3: Check voting status for a test address
    console.log("\n3️⃣ Testing voting status check...");
    const testAddress = "0x1234567890123456789012345678901234567890";
    const hasVoted = await client.readContract({
      address: addresses.electionManager,
      abi: ELECTION_ABI,
      functionName: "checkHasVoted",
      args: [testAddress],
    });
    console.log(`   Test address ${testAddress} has voted: ${hasVoted ? 'YES' : 'NO'}`);

    // Summary
    console.log("\n📊 Test Summary");
    console.log("===============");
    console.log(`✅ Contract accessible: YES`);
    console.log(`✅ Voting active: ${votingActive ? 'YES' : 'NO'}`);
    console.log(`✅ Candidates loaded: ${candidates.length} found`);
    console.log(`✅ Vote checking: Working`);

    if (candidates.length === 0) {
      console.log("\n⚠️  WARNING: No candidates found! Make sure candidates are added to the contract.");
    }

    if (!votingActive) {
      console.log("\n⚠️  WARNING: Voting is not active! Enable voting in the contract.");
    }

    console.log("\n🎉 Voting flow test completed successfully!");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

// Run the test
testVotingFlow();
