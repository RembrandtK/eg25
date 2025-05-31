const { ethers } = require("hardhat");
const { VoteReader } = require("./vote-reader");
const { TidemanCalculator } = require("./tideman-calculator");
const fs = require("fs");
const path = require("path");

/**
 * Script to run Tideman calculation on a deployed Election contract
 * 
 * Usage:
 * npx hardhat run scripts/run-tideman-calculation.js --network worldchain-sepolia
 */

async function getContractAddress() {
  try {
    // Try to read from deployment info
    const deploymentInfoPath = path.join(__dirname, "../deployment-info.json");
    if (fs.existsSync(deploymentInfoPath)) {
      const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, "utf8"));
      if (deploymentInfo.electionManager) {
        return deploymentInfo.electionManager;
      }
    }

    // Try to read from local address book
    const addressBookPath = path.join(__dirname, "../local-address-book.json");
    if (fs.existsSync(addressBookPath)) {
      const addressBook = JSON.parse(fs.readFileSync(addressBookPath, "utf8"));
      if (addressBook.electionManager) {
        return addressBook.electionManager;
      }
    }

    throw new Error("No contract address found. Please deploy the contract first or provide an address.");
  } catch (error) {
    console.error("Error reading contract address:", error.message);
    throw error;
  }
}

async function main() {
  console.log("🗳️ Running Tideman Calculation");
  console.log("==============================");

  try {
    // Get contract address
    const contractAddress = await getContractAddress();
    console.log(`📍 Contract Address: ${contractAddress}`);

    // Get provider
    const provider = ethers.provider;
    console.log(`🔗 Network: ${provider.network?.name || 'unknown'}`);

    // Initialize vote reader
    console.log("\n📖 Initializing vote reader...");
    const voteReader = new VoteReader(contractAddress, provider);

    // Get basic election info
    const electionInfo = await voteReader.getElectionInfo();
    console.log(`📊 Election: "${electionInfo.title}"`);
    console.log(`📝 Description: ${electionInfo.description}`);
    console.log(`👥 Total Voters: ${electionInfo.totalVoters}`);
    console.log(`🗳️ Voting Active: ${electionInfo.votingActive ? 'Yes' : 'No'}`);

    // Check if there are any votes
    if (electionInfo.totalVoters === 0) {
      console.log("\n⚠️ No votes found. Please cast some votes first.");
      return;
    }

    // Get vote statistics
    console.log("\n📈 Getting vote statistics...");
    const stats = await voteReader.getVoteStatistics();
    console.log(`📊 Vote Statistics:`);
    console.log(`   Total Voters: ${stats.totalVoters}`);
    console.log(`   Valid Votes: ${stats.validVotes}`);
    console.log(`   Candidate Count: ${stats.candidateCount}`);
    console.log(`   Average Ranking Length: ${stats.averageRankingLength.toFixed(2)}`);
    console.log(`   Complete Rankings: ${stats.completeRankings}`);
    console.log(`   Partial Rankings: ${stats.partialRankings}`);
    console.log(`   Votes with Ties: ${stats.votesWithTies}`);

    // Initialize Tideman calculator
    console.log("\n🧮 Initializing Tideman calculator...");
    const tidemanCalculator = new TidemanCalculator(voteReader);

    // Run complete calculation
    console.log("\n🚀 Running Tideman calculation...");
    const startTime = Date.now();
    const result = await tidemanCalculator.calculate();
    const endTime = Date.now();

    console.log(`⏱️ Calculation completed in ${endTime - startTime}ms`);

    // Display results
    console.log("\n🏆 TIDEMAN RESULTS");
    console.log("==================");
    
    console.log(`\n👑 Winner: ${result.winner.name}`);
    console.log(`📝 Description: ${result.winner.description}`);

    console.log("\n📊 Final Ranking:");
    result.finalRanking.forEach(entry => {
      console.log(`   ${entry.rank}. ${entry.candidate.name} - ${entry.candidate.description}`);
    });

    console.log("\n🔢 Pairwise Tallies:");
    const candidates = result.votes.candidates;
    for (const candidateA of candidates) {
      for (const candidateB of candidates) {
        if (candidateA.id !== candidateB.id) {
          const key = `${candidateA.id}-${candidateB.id}`;
          const tally = result.pairwiseTallies[key] || 0;
          console.log(`   ${candidateA.name} vs ${candidateB.name}: ${tally}`);
        }
      }
    }

    console.log("\n🔗 Ranked Pairs (by margin):");
    result.rankedPairs.forEach((pair, index) => {
      const winnerName = candidates.find(c => c.id === pair.winner)?.name;
      const loserName = candidates.find(c => c.id === pair.loser)?.name;
      const locked = result.lockedPairs.includes(`${pair.winner}-${pair.loser}`) ? "🔒 LOCKED" : "❌ SKIPPED";
      console.log(`   ${index + 1}. ${winnerName} beats ${loserName} (margin: ${pair.margin}) ${locked}`);
    });

    // Save results to file
    const resultsPath = path.join(__dirname, "../tideman-results.json");
    const resultsData = {
      timestamp: new Date().toISOString(),
      electionInfo,
      stats,
      result: {
        winner: result.winner,
        finalRanking: result.finalRanking,
        pairwiseTallies: result.pairwiseTallies,
        rankedPairs: result.rankedPairs,
        lockedPairs: result.lockedPairs
      }
    };
    
    fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);

    console.log("\n✅ Tideman calculation completed successfully!");

  } catch (error) {
    console.error("\n❌ Error running Tideman calculation:", error);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.length > 2) {
  const contractAddress = process.argv[2];
  if (ethers.isAddress(contractAddress)) {
    // Override contract address if provided
    main.contractAddress = contractAddress;
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
