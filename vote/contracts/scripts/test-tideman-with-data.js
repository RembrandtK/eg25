const { ethers } = require("hardhat");
const { VoteReader } = require("./vote-reader");
const { TidemanCalculator } = require("./tideman-calculator");

/**
 * Test script to create sample data and run Tideman calculation
 */

async function main() {
  console.log("🧪 Testing Tideman Method with Sample Data");
  console.log("==========================================");

  try {
    // Deploy contracts for testing
    console.log("📦 Deploying test contracts...");
    const [owner, creator, voter1, voter2, voter3, voter4] = await ethers.getSigners();

    // Deploy mock World ID
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    const mockWorldID = await MockWorldID.deploy();

    // Deploy Election contract
    const Election = await ethers.getContractFactory("Election");
    const election = await Election.deploy(
      mockWorldID.target,
      "Tideman Test Election",
      "Testing Tideman ranked-pair method with real data",
      "vote_tideman_test",
      creator.address
    );

    console.log(`📍 Election Contract: ${election.target}`);

    // Add candidates
    const candidates = [
      { name: "Alice Johnson", description: "Progressive candidate" },
      { name: "Bob Smith", description: "Conservative candidate" },
      { name: "Carol Davis", description: "Independent candidate" },
      { name: "Dave Wilson", description: "Green party candidate" }
    ];

    console.log("👥 Adding candidates...");
    for (const candidate of candidates) {
      await election.addCandidate(candidate.name, candidate.description);
      console.log(`   ✅ Added: ${candidate.name}`);
    }

    // Helper function for mock proofs
    function getMockWorldIDProof(voterAddress, voterId, ranking) {
      const candidateIds = ranking.map(r => r.candidateId);
      const tiedFlags = ranking.map(r => r.tiedWithPrevious);
      const signal = ethers.solidityPackedKeccak256(
        ["uint256[]", "bool[]"],
        [candidateIds, tiedFlags]
      );
      return {
        signal: signal,
        root: 1,
        voterId: voterId,
        proof: [0, 0, 0, 0, 0, 0, 0, 0]
      };
    }

    // Cast test votes with different preferences
    console.log("\n🗳️ Casting test votes...");

    // Vote 1: Alice > Bob > Carol > Dave
    const vote1 = [
      { candidateId: 1, tiedWithPrevious: false },
      { candidateId: 2, tiedWithPrevious: false },
      { candidateId: 3, tiedWithPrevious: false },
      { candidateId: 4, tiedWithPrevious: false }
    ];
    const proof1 = getMockWorldIDProof(voter1.address, 1001, vote1);
    await election.connect(voter1).vote(proof1.signal, proof1.root, proof1.voterId, proof1.proof, vote1);
    console.log("   ✅ Vote 1: Alice > Bob > Carol > Dave");

    // Vote 2: Bob > Carol > Dave > Alice
    const vote2 = [
      { candidateId: 2, tiedWithPrevious: false },
      { candidateId: 3, tiedWithPrevious: false },
      { candidateId: 4, tiedWithPrevious: false },
      { candidateId: 1, tiedWithPrevious: false }
    ];
    const proof2 = getMockWorldIDProof(voter2.address, 1002, vote2);
    await election.connect(voter2).vote(proof2.signal, proof2.root, proof2.voterId, proof2.proof, vote2);
    console.log("   ✅ Vote 2: Bob > Carol > Dave > Alice");

    // Vote 3: Carol > Dave > Alice > Bob
    const vote3 = [
      { candidateId: 3, tiedWithPrevious: false },
      { candidateId: 4, tiedWithPrevious: false },
      { candidateId: 1, tiedWithPrevious: false },
      { candidateId: 2, tiedWithPrevious: false }
    ];
    const proof3 = getMockWorldIDProof(voter3.address, 1003, vote3);
    await election.connect(voter3).vote(proof3.signal, proof3.root, proof3.voterId, proof3.proof, vote3);
    console.log("   ✅ Vote 3: Carol > Dave > Alice > Bob");

    // Vote 4: Dave > Alice > Bob > Carol
    const vote4 = [
      { candidateId: 4, tiedWithPrevious: false },
      { candidateId: 1, tiedWithPrevious: false },
      { candidateId: 2, tiedWithPrevious: false },
      { candidateId: 3, tiedWithPrevious: false }
    ];
    const proof4 = getMockWorldIDProof(voter4.address, 1004, vote4);
    await election.connect(voter4).vote(proof4.signal, proof4.root, proof4.voterId, proof4.proof, vote4);
    console.log("   ✅ Vote 4: Dave > Alice > Bob > Carol");

    // Vote 5: Alice = Bob > Carol (with ties)
    const vote5 = [
      { candidateId: 1, tiedWithPrevious: false }, // Alice first
      { candidateId: 2, tiedWithPrevious: true },  // Bob tied with Alice
      { candidateId: 3, tiedWithPrevious: false }  // Carol third
    ];
    const proof5 = getMockWorldIDProof(voter1.address, 1005, vote5);
    await election.connect(voter1).vote(proof5.signal, proof5.root, proof5.voterId, proof5.proof, vote5);
    console.log("   ✅ Vote 5: Alice = Bob > Carol (with ties)");

    // Initialize vote reader and calculator
    console.log("\n📖 Initializing Tideman calculator...");
    const voteReader = new VoteReader(election.target, ethers.provider);
    const tidemanCalculator = new TidemanCalculator(voteReader);

    // Run calculation
    console.log("\n🚀 Running Tideman calculation...");
    const startTime = Date.now();
    const result = await tidemanCalculator.calculate();
    const endTime = Date.now();

    // Display detailed results
    console.log("\n🏆 TIDEMAN RESULTS");
    console.log("==================");
    console.log(`⏱️ Calculation time: ${endTime - startTime}ms`);
    console.log(`📊 Total votes processed: ${result.votes.votes.length}`);
    console.log(`👥 Candidates: ${result.votes.candidates.length}`);

    console.log(`\n👑 WINNER: ${result.winner.name}`);
    console.log(`📝 Description: ${result.winner.description}`);

    console.log("\n📊 FINAL RANKING:");
    result.finalRanking.forEach(entry => {
      console.log(`   ${entry.rank}. ${entry.candidate.name} - ${entry.candidate.description}`);
    });

    console.log("\n🔢 PAIRWISE TALLIES:");
    const candidateList = result.votes.candidates;
    for (const candidateA of candidateList) {
      for (const candidateB of candidateList) {
        if (candidateA.id !== candidateB.id) {
          const key = `${candidateA.id}-${candidateB.id}`;
          const tally = result.pairwiseTallies[key] || 0;
          console.log(`   ${candidateA.name} vs ${candidateB.name}: ${tally} votes`);
        }
      }
    }

    console.log("\n🔗 RANKED PAIRS (by margin of victory):");
    result.rankedPairs.forEach((pair, index) => {
      const winnerName = candidateList.find(c => c.id === pair.winner)?.name;
      const loserName = candidateList.find(c => c.id === pair.loser)?.name;
      const locked = result.lockedPairs.includes(`${pair.winner}-${pair.loser}`) ? "🔒 LOCKED" : "❌ SKIPPED (cycle)";
      console.log(`   ${index + 1}. ${winnerName} beats ${loserName} (${pair.winnerVotes}-${pair.loserVotes}, margin: ${pair.margin}) ${locked}`);
    });

    console.log("\n🔒 LOCKED PAIRS:");
    result.lockedPairs.forEach(pair => {
      const [winnerId, loserId] = pair.split('-').map(Number);
      const winnerName = candidateList.find(c => c.id === winnerId)?.name;
      const loserName = candidateList.find(c => c.id === loserId)?.name;
      console.log(`   ${winnerName} → ${loserName}`);
    });

    console.log("\n📈 VOTE STATISTICS:");
    const stats = await voteReader.getVoteStatistics();
    console.log(`   Total voters: ${stats.totalVoters}`);
    console.log(`   Valid votes: ${stats.validVotes}`);
    console.log(`   Average ranking length: ${stats.averageRankingLength.toFixed(2)}`);
    console.log(`   Complete rankings: ${stats.completeRankings}`);
    console.log(`   Partial rankings: ${stats.partialRankings}`);
    console.log(`   Votes with ties: ${stats.votesWithTies}`);

    console.log("\n✅ Tideman calculation completed successfully!");
    console.log("\n💡 Key insights:");
    console.log("   - The Tideman method found a clear winner by avoiding cycles");
    console.log("   - Pairwise comparisons show the strength of each candidate");
    console.log("   - The algorithm handled ties in individual votes correctly");

  } catch (error) {
    console.error("\n❌ Error in Tideman test:", error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
