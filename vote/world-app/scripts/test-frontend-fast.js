#!/usr/bin/env node

/**
 * Fast Frontend Testing Script
 * Provides rapid feedback on frontend functionality without manual browser testing
 */

const { createPublicClient, http } = require("viem");
const https = require("https");
const http_module = require("http");

// Configuration
const CONFIG = {
  frontendUrl: "http://localhost:3000",
  contractAddress: "0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7",
  rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
  chainId: 4801
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

// Election ABI (minimal for testing)
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

async function testFrontendHealth() {
  console.log("🏥 Testing Frontend Health...");

  try {
    const response = await fetch(CONFIG.frontendUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'Frontend-Test-Script' }
    });

    if (response.ok) {
      console.log("✅ Frontend server is responding");
      return true;
    } else {
      console.log(`❌ Frontend server returned ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Frontend server not accessible: ${error.message}`);
    return false;
  }
}

async function testContractConnection() {
  console.log("🔗 Testing Contract Connection...");

  try {
    const client = createPublicClient({
      chain: worldchainSepolia,
      transport: http(CONFIG.rpcUrl)
    });

    // Test 1: Get candidate count
    const candidateCount = await client.readContract({
      address: CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "candidateCount"
    });

    console.log(`✅ Contract accessible - ${candidateCount} candidates`);

    // Test 2: Get candidates
    const candidates = await client.readContract({
      address: CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "getCandidates"
    });

    console.log(`✅ getCandidates() works - returned ${candidates.length} candidates`);

    candidates.forEach((candidate, index) => {
      console.log(`   ${index + 1}. ${candidate.name}`);
    });

    // Test 3: Check voting status
    const votingActive = await client.readContract({
      address: CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "votingActive"
    });

    console.log(`✅ Voting status: ${votingActive ? 'Active' : 'Inactive'}`);

    return {
      success: true,
      candidateCount: Number(candidateCount),
      candidates: candidates.length,
      votingActive
    };

  } catch (error) {
    console.log(`❌ Contract connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testFrontendAPI() {
  console.log("🔌 Testing Frontend API Endpoints...");

  const endpoints = [
    '/api/auth/session',
    '/api/nonce',
    '/api/auth/providers'
  ];

  const results = {};

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${CONFIG.frontendUrl}${endpoint}`, {
        timeout: 3000,
        headers: { 'User-Agent': 'Frontend-Test-Script' }
      });

      if (response.ok) {
        console.log(`✅ ${endpoint} - OK`);
        results[endpoint] = 'OK';
      } else {
        console.log(`⚠️  ${endpoint} - ${response.status}`);
        results[endpoint] = response.status;
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - ${error.message}`);
      results[endpoint] = 'ERROR';
    }
  }

  return results;
}

async function runComprehensiveTest() {
  console.log("🧪 Fast Frontend Testing Suite");
  console.log("=" .repeat(50));
  console.log(`Frontend URL: ${CONFIG.frontendUrl}`);
  console.log(`Contract: ${CONFIG.contractAddress}`);
  console.log(`Network: Worldchain Sepolia (${CONFIG.chainId})`);
  console.log("");

  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test 1: Frontend Health
  results.tests.frontendHealth = await testFrontendHealth();
  console.log("");

  // Test 2: Contract Connection
  results.tests.contractConnection = await testContractConnection();
  console.log("");

  // Test 3: API Endpoints
  results.tests.apiEndpoints = await testFrontendAPI();
  console.log("");

  // Summary
  console.log("📊 Test Summary:");
  console.log(`Frontend Health: ${results.tests.frontendHealth ? '✅' : '❌'}`);
  console.log(`Contract Connection: ${results.tests.contractConnection.success ? '✅' : '❌'}`);

  const apiSuccess = Object.values(results.tests.apiEndpoints).every(status =>
    status === 'OK' || status === 200 || status === 401 // 401 is expected for auth endpoints
  );
  console.log(`API Endpoints: ${apiSuccess ? '✅' : '❌'}`);

  const overallSuccess = results.tests.frontendHealth &&
                         results.tests.contractConnection.success &&
                         apiSuccess;

  console.log("");
  console.log(`🎯 Overall Status: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);

  if (overallSuccess) {
    console.log("🎉 Frontend is ready for testing!");
    console.log(`📱 Open ${CONFIG.frontendUrl} in your browser`);
  } else {
    console.log("🔧 Issues detected - check logs above");
  }

  return { success: overallSuccess, details: results };
}

// Auto-run if executed directly
if (require.main === module) {
  runComprehensiveTest()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error("💥 Test script failed:", error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTest, testContractConnection, testFrontendHealth };
