/**
 * Frontend Integration Test for Candidate Loading
 * This test verifies that the frontend can successfully load candidates from the deployed contract
 */

import { createPublicClient, http } from "viem";
import { worldchain } from "../lib/chains";
import { ELECTION_ABI } from "../election-abi";
import { ELECTION_MANAGER_ADDRESS } from "../config/dynamic-contracts";

// Test configuration
const TEST_CONFIG = {
  contractAddress: ELECTION_MANAGER_ADDRESS,
  expectedCandidates: [
    { name: "Alice Johnson", description: "Experienced leader focused on community development and transparency" },
    { name: "Bob Smith", description: "Innovation advocate with a background in technology education" },
    { name: "Carol Davis", description: "Environmental champion committed to sustainable policies" },
    { name: "David Wilson", description: "Economic policy expert with focus on fair growth and opportunity" }
  ]
};

async function testCandidateLoading() {
  console.log("🧪 Testing Frontend Candidate Loading...");
  console.log(`Contract Address: ${TEST_CONFIG.contractAddress}`);

  try {
    // Initialize Viem client (same as CandidateList component)
    const client = createPublicClient({
      chain: worldchain,
      transport: http("https://worldchain-sepolia.g.alchemy.com/public"),
    });

    console.log("📡 Connecting to worldchain-sepolia...");

    // Test 1: Get candidates from contract
    console.log("🔍 Fetching candidates from contract...");
    const candidates = await client.readContract({
      address: TEST_CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "getCandidates",
      args: [],
    });

    console.log(`✅ Successfully fetched ${candidates.length} candidates`);

    // Test 2: Verify candidate data structure
    console.log("🔍 Verifying candidate data structure...");
    candidates.forEach((candidate, index) => {
      console.log(`Candidate ${index + 1}:`);
      console.log(`  ID: ${candidate.id.toString()}`);
      console.log(`  Name: ${candidate.name}`);
      console.log(`  Description: ${candidate.description}`);
      console.log(`  Active: ${candidate.active}`);

      // Verify required fields exist
      if (!candidate.id || !candidate.name || !candidate.description) {
        throw new Error(`Candidate ${index + 1} missing required fields`);
      }

      if (!candidate.active) {
        throw new Error(`Candidate ${index + 1} is not active`);
      }
    });

    // Test 3: Verify expected candidates are present
    console.log("🔍 Verifying expected candidates are present...");
    const expectedNames = TEST_CONFIG.expectedCandidates.map(c => c.name);
    const actualNames = candidates.map(c => c.name);

    expectedNames.forEach(expectedName => {
      if (!actualNames.includes(expectedName)) {
        throw new Error(`Expected candidate "${expectedName}" not found`);
      }
    });

    // Test 4: Check candidate count
    console.log("🔍 Checking candidate count...");
    const candidateCount = await client.readContract({
      address: TEST_CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "candidateCount",
      args: [],
    });

    console.log(`📊 Total candidate count: ${candidateCount.toString()}`);

    if (Number(candidateCount) !== candidates.length) {
      throw new Error(`Candidate count mismatch: expected ${candidateCount}, got ${candidates.length}`);
    }

    // Test 5: Check voting status
    console.log("🔍 Checking voting status...");
    const votingActive = await client.readContract({
      address: TEST_CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "votingActive",
      args: [],
    });

    console.log(`🗳️ Voting active: ${votingActive}`);

    // Test 6: Check total votes
    console.log("🔍 Checking total votes...");
    const totalVotes = await client.readContract({
      address: TEST_CONFIG.contractAddress,
      abi: ELECTION_ABI,
      functionName: "getTotalVotes",
      args: [],
    });

    console.log(`📈 Total votes cast: ${totalVotes.toString()}`);

    console.log("\n🎉 All frontend integration tests passed!");
    console.log("✅ Contract is accessible from frontend");
    console.log("✅ Candidates load correctly");
    console.log("✅ Data structure is valid");
    console.log("✅ Expected candidates are present");
    console.log("✅ Contract state is consistent");

    return {
      success: true,
      candidates,
      candidateCount: Number(candidateCount),
      votingActive,
      totalVotes: Number(totalVotes)
    };

  } catch (error) {
    console.error("❌ Frontend integration test failed:");
    console.error(error.message);
    console.error(error.stack);

    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in other tests or manual execution
export { testCandidateLoading, TEST_CONFIG };

// Auto-run if this file is executed directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  testCandidateLoading().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}
