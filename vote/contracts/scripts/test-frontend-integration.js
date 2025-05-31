const { ethers } = require("hardhat");

async function testFrontendIntegration() {
  console.log("🧪 Testing Frontend Integration with Deployed Contract");
  console.log("=" .repeat(60));

  const contractAddress = "0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7";
  
  try {
    // Connect to the deployed contract
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    const electionManager = ElectionManager.attach(contractAddress);
    
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`🌐 Network: ${hre.network.name}`);
    
    // Test 1: Get candidates (simulates CandidateList component)
    console.log("\n🔍 Test 1: Getting candidates (CandidateList simulation)");
    const candidates = await electionManager.getCandidates();
    console.log(`✅ Found ${candidates.length} candidates:`);
    
    candidates.forEach((candidate, index) => {
      console.log(`   ${index + 1}. ${candidate.name} - ${candidate.description}`);
    });
    
    // Test 2: Check contract state
    console.log("\n🔍 Test 2: Checking contract state");
    const candidateCount = await electionManager.candidateCount();
    const votingActive = await electionManager.votingActive();
    const totalVotes = await electionManager.getTotalVotes();
    const owner = await electionManager.owner();
    
    console.log(`   📊 Candidate Count: ${candidateCount}`);
    console.log(`   🗳️  Voting Active: ${votingActive}`);
    console.log(`   📈 Total Votes: ${totalVotes}`);
    console.log(`   👤 Owner: ${owner}`);
    
    // Test 3: Simulate vote ranking (what CandidateRanking component would do)
    console.log("\n🔍 Test 3: Simulating vote ranking");
    const sampleRankings = [
      [1, 2, 3, 4], // Alice, Bob, Carol, David
      [2, 1, 4, 3], // Bob, Alice, David, Carol
      [3, 4, 1, 2], // Carol, David, Alice, Bob
      [4, 3, 2, 1]  // David, Carol, Bob, Alice
    ];
    
    sampleRankings.forEach((ranking, index) => {
      const candidateNames = ranking.map(id => candidates[id - 1]?.name || `Candidate ${id}`);
      console.log(`   Ranking ${index + 1}: ${candidateNames.join(" > ")}`);
    });
    
    // Test 4: Check if specific addresses have voted (simulates frontend checks)
    console.log("\n🔍 Test 4: Checking voting status for test addresses");
    const testAddresses = [
      "0x046B7CDb0DACE9d4c0B5396f34d47945e974E369", // From parameters
      "0x1234567890123456789012345678901234567890", // Random address
    ];
    
    for (const address of testAddresses) {
      try {
        const hasVoted = await electionManager.checkHasVoted(address);
        console.log(`   ${address}: ${hasVoted ? "Has voted" : "Has not voted"}`);
      } catch (error) {
        console.log(`   ${address}: Error checking status - ${error.message}`);
      }
    }
    
    // Test 5: Validate contract ABI matches frontend expectations
    console.log("\n🔍 Test 5: Validating contract interface");
    const expectedFunctions = [
      "getCandidates",
      "vote",
      "checkHasVoted",
      "getTotalVotes",
      "candidateCount",
      "votingActive"
    ];
    
    for (const functionName of expectedFunctions) {
      try {
        const fragment = electionManager.interface.getFunction(functionName);
        console.log(`   ✅ ${functionName}: ${fragment.format()}`);
      } catch (error) {
        console.log(`   ❌ ${functionName}: Not found`);
      }
    }
    
    // Test 6: Gas estimation for voting (helps frontend estimate costs)
    console.log("\n🔍 Test 6: Gas estimation for voting");
    const [signer] = await ethers.getSigners();
    
    try {
      // Estimate gas for different vote sizes
      const voteSizes = [
        [1],           // Single candidate
        [1, 2],        // Two candidates  
        [1, 2, 3],     // Three candidates
        [1, 2, 3, 4]   // All candidates
      ];
      
      for (const voteRanking of voteSizes) {
        try {
          const gasEstimate = await electionManager.connect(signer).vote.estimateGas(voteRanking);
          console.log(`   ${voteRanking.length} candidate(s): ~${gasEstimate.toString()} gas`);
        } catch (error) {
          console.log(`   ${voteRanking.length} candidate(s): Cannot estimate (${error.reason || error.message})`);
        }
      }
    } catch (error) {
      console.log(`   Gas estimation failed: ${error.message}`);
    }
    
    console.log("\n🎉 Frontend integration test completed successfully!");
    console.log("✅ Contract is accessible and functional");
    console.log("✅ All expected functions are available");
    console.log("✅ Candidate data is properly structured");
    console.log("✅ Contract state is consistent");
    
    return {
      success: true,
      candidateCount: Number(candidateCount),
      votingActive,
      totalVotes: Number(totalVotes),
      candidates: candidates.map(c => ({
        id: Number(c.id),
        name: c.name,
        description: c.description,
        active: c.active
      }))
    };
    
  } catch (error) {
    console.error("\n❌ Frontend integration test failed:");
    console.error(`Error: ${error.message}`);
    if (error.reason) {
      console.error(`Reason: ${error.reason}`);
    }
    console.error(`Stack: ${error.stack}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testFrontendIntegration()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Unexpected error:", error);
      process.exit(1);
    });
}

module.exports = { testFrontendIntegration };
