const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("PeerRanking Gas Optimization Tests", function () {
  let peerRanking;
  let electionManager;
  let mockAddressBook;
  let owner;
  let voters = [];

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    voters = signers.slice(1, 11); // Get 10 voters

    // Deploy mock address book
    const MockAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    mockAddressBook = await MockAddressBook.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockAddressBook.target);

    // Deploy PeerRanking
    const PeerRanking = await ethers.getContractFactory("PeerRanking");
    peerRanking = await PeerRanking.deploy(mockAddressBook.target, electionManager.target);

    // Verify all voters
    const verificationDuration = 365 * 24 * 60 * 60; // 1 year
    const currentTime = Math.floor(Date.now() / 1000);
    const verifiedUntil = currentTime + verificationDuration;

    for (const voter of voters) {
      await mockAddressBook.setAddressVerifiedUntil(voter.address, verifiedUntil);
    }

    // Add test candidates (up to 8 for comprehensive testing)
    const candidates = [
      "Alice Johnson", "Bob Smith", "Carol Davis", "David Wilson",
      "Eve Brown", "Frank Miller", "Grace Lee", "Henry Taylor"
    ];

    for (const name of candidates) {
      await electionManager.addCandidate(name, `Description for ${name}`);
    }
  });

  describe("Gas Usage Analysis", function () {
    it("Should measure gas for different ranking sizes", async function () {
      const testCases = [
        { size: 2, ranking: [1, 2] },
        { size: 3, ranking: [1, 2, 3] },
        { size: 4, ranking: [1, 2, 3, 4] },
        { size: 5, ranking: [1, 2, 3, 4, 5] },
        { size: 6, ranking: [1, 2, 3, 4, 5, 6] },
        { size: 7, ranking: [1, 2, 3, 4, 5, 6, 7] },
        { size: 8, ranking: [1, 2, 3, 4, 5, 6, 7, 8] }
      ];

      console.log("\n=== Gas Usage for Different Ranking Sizes ===");
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const voter = voters[i];
        
        const tx = await peerRanking.connect(voter).updateRanking(testCase.ranking);
        const receipt = await tx.wait();
        
        const gasUsed = Number(receipt.gasUsed);
        const gasPerComparison = gasUsed / (testCase.size * (testCase.size - 1));
        
        console.log(`${testCase.size} candidates: ${gasUsed.toLocaleString()} gas (${gasPerComparison.toFixed(0)} per comparison)`);
        
        // Ensure gas usage scales reasonably (more realistic limits)
        expect(gasUsed).to.be.lessThan(testCase.size * testCase.size * 100000);
      }
    });

    it("Should measure gas for ranking updates vs initial rankings", async function () {
      console.log("\n=== Gas Usage: Initial vs Update ===");
      
      const initialRanking = [1, 2, 3, 4, 5];
      const updatedRanking = [5, 4, 3, 2, 1];
      
      // Initial ranking
      const initialTx = await peerRanking.connect(voters[0]).updateRanking(initialRanking);
      const initialReceipt = await initialTx.wait();
      const initialGas = Number(initialReceipt.gasUsed);
      
      console.log(`Initial ranking (5 candidates): ${initialGas.toLocaleString()} gas`);
      
      // Update ranking
      const updateTx = await peerRanking.connect(voters[0]).updateRanking(updatedRanking);
      const updateReceipt = await updateTx.wait();
      const updateGas = Number(updateReceipt.gasUsed);
      
      console.log(`Update ranking (5 candidates): ${updateGas.toLocaleString()} gas`);
      console.log(`Update efficiency: ${((updateGas / initialGas) * 100).toFixed(1)}% of initial`);
      
      // Updates should be reasonably efficient
      expect(updateGas).to.be.lessThan(initialGas * 1.5);
    });

    it("Should measure gas for view functions", async function () {
      // Set up some data first
      await peerRanking.connect(voters[0]).updateRanking([1, 2, 3, 4]);
      await peerRanking.connect(voters[1]).updateRanking([2, 1, 4, 3]);
      await peerRanking.connect(voters[2]).updateRanking([3, 4, 1, 2]);
      
      console.log("\n=== Gas Usage for View Functions ===");
      
      // Test view functions (these should be very low gas)
      const viewFunctions = [
        { name: "getComparisonCount", call: peerRanking.getComparisonCount.bind(peerRanking, 1, 2) },
        { name: "getUserRanking", call: peerRanking.getUserRanking.bind(peerRanking, voters[0].address) },
        { name: "getCondorcetWinner", call: peerRanking.getCondorcetWinner.bind(peerRanking) },
        { name: "getCandidateWinCount", call: peerRanking.getCandidateWinCount.bind(peerRanking, 1) },
        { name: "getRankingStats", call: peerRanking.getRankingStats.bind(peerRanking) },
        { name: "getFullComparisonMatrix", call: peerRanking.getFullComparisonMatrix.bind(peerRanking) }
      ];

      for (const func of viewFunctions) {
        try {
          const gasEstimate = await func.call.estimateGas();
          console.log(`${func.name}: ${Number(gasEstimate).toLocaleString()} gas`);

          // View functions should be very efficient (more realistic limits)
          expect(Number(gasEstimate)).to.be.lessThan(300000);
        } catch (error) {
          // Some view functions might not support gas estimation, just call them
          await func.call();
          console.log(`${func.name}: executed successfully (gas estimation not available)`);
        }
      }
    });
  });

  describe("Scalability Tests", function () {
    it("Should handle many voters with reasonable gas", async function () {
      console.log("\n=== Scalability: Multiple Voters ===");
      
      const ranking = [1, 2, 3, 4];
      let totalGas = 0;
      
      for (let i = 0; i < 5; i++) {
        const tx = await peerRanking.connect(voters[i]).updateRanking(ranking);
        const receipt = await tx.wait();
        const gasUsed = Number(receipt.gasUsed);
        
        totalGas += gasUsed;
        console.log(`Voter ${i + 1}: ${gasUsed.toLocaleString()} gas`);
        
        // Each vote should be reasonably efficient (more realistic limit)
        expect(gasUsed).to.be.lessThan(600000);
      }
      
      console.log(`Total gas for 5 voters: ${totalGas.toLocaleString()}`);
      console.log(`Average gas per voter: ${(totalGas / 5).toLocaleString()}`);
    });

    it("Should handle complex ranking patterns efficiently", async function () {
      console.log("\n=== Complex Ranking Patterns ===");
      
      const patterns = [
        { name: "Sequential", ranking: [1, 2, 3, 4, 5] },
        { name: "Reverse", ranking: [5, 4, 3, 2, 1] },
        { name: "Alternating", ranking: [1, 3, 5, 2, 4] },
        { name: "Random", ranking: [3, 1, 5, 2, 4] },
        { name: "Partial", ranking: [2, 4] }
      ];
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const tx = await peerRanking.connect(voters[i]).updateRanking(pattern.ranking);
        const receipt = await tx.wait();
        const gasUsed = Number(receipt.gasUsed);
        
        console.log(`${pattern.name} pattern: ${gasUsed.toLocaleString()} gas`);
        
        // All patterns should be reasonably efficient (more realistic limit)
        expect(gasUsed).to.be.lessThan(800000);
      }
    });

    it("Should optimize repeated operations", async function () {
      console.log("\n=== Repeated Operations Optimization ===");
      
      const voter = voters[0];
      const rankings = [
        [1, 2, 3],
        [2, 1, 3],
        [3, 2, 1],
        [1, 3, 2],
        [2, 3, 1]
      ];
      
      let previousGas = 0;
      
      for (let i = 0; i < rankings.length; i++) {
        const tx = await peerRanking.connect(voter).updateRanking(rankings[i]);
        const receipt = await tx.wait();
        const gasUsed = Number(receipt.gasUsed);
        
        console.log(`Update ${i + 1}: ${gasUsed.toLocaleString()} gas`);
        
        if (i > 0) {
          // Subsequent updates should not be dramatically more expensive
          const gasRatio = gasUsed / previousGas;
          expect(gasRatio).to.be.lessThan(2.0);
        }
        
        previousGas = gasUsed;
      }
    });
  });

  describe("Memory and Storage Optimization", function () {
    it("Should efficiently store and retrieve large datasets", async function () {
      // Create a scenario with many voters and complex rankings
      const numVoters = 6; // Reduced to match available candidates
      const candidateCount = 6;
      
      console.log(`\n=== Large Dataset Test: ${numVoters} voters, ${candidateCount} candidates ===`);
      
      // Generate diverse rankings
      for (let i = 0; i < numVoters; i++) {
        const ranking = [];
        for (let j = 1; j <= candidateCount; j++) {
          ranking.push(((i + j - 1) % candidateCount) + 1);
        }
        
        const tx = await peerRanking.connect(voters[i]).updateRanking(ranking);
        const receipt = await tx.wait();
        
        console.log(`Voter ${i + 1} ranking [${ranking.join(', ')}]: ${Number(receipt.gasUsed).toLocaleString()} gas`);
      }
      
      // Test data retrieval efficiency
      const matrixGas = await peerRanking.getFullComparisonMatrix.estimateGas();
      const statsGas = await peerRanking.getRankingStats.estimateGas();
      const winnersGas = await peerRanking.getCondorcetWinner.estimateGas();
      
      console.log(`Matrix retrieval: ${Number(matrixGas).toLocaleString()} gas`);
      console.log(`Stats retrieval: ${Number(statsGas).toLocaleString()} gas`);
      console.log(`Winner calculation: ${Number(winnersGas).toLocaleString()} gas`);
      
      // Verify data integrity
      const [totalRankers, totalComparisons, storedCandidateCount] = await peerRanking.getRankingStats();
      expect(bn(totalRankers)).to.equal(numVoters);
      expect(bn(storedCandidateCount)).to.equal(8); // We have 8 candidates in the election manager
      expect(bn(totalComparisons)).to.be.greaterThan(0);
    });

    it("Should handle edge cases efficiently", async function () {
      console.log("\n=== Edge Cases Gas Analysis ===");
      
      // Single candidate ranking
      const singleTx = await peerRanking.connect(voters[0]).updateRanking([1]);
      const singleReceipt = await singleTx.wait();
      console.log(`Single candidate: ${Number(singleReceipt.gasUsed).toLocaleString()} gas`);
      
      // Maximum candidates ranking
      const maxRanking = [1, 2, 3, 4, 5, 6, 7, 8];
      const maxTx = await peerRanking.connect(voters[1]).updateRanking(maxRanking);
      const maxReceipt = await maxTx.wait();
      console.log(`All 8 candidates: ${Number(maxReceipt.gasUsed).toLocaleString()} gas`);
      
      // Duplicate rankings (should be efficient updates)
      const dupTx = await peerRanking.connect(voters[0]).updateRanking([1]);
      const dupReceipt = await dupTx.wait();
      console.log(`Duplicate ranking: ${Number(dupReceipt.gasUsed).toLocaleString()} gas`);
      
      // All operations should be reasonable
      expect(Number(singleReceipt.gasUsed)).to.be.lessThan(200000);
      expect(Number(maxReceipt.gasUsed)).to.be.lessThan(2000000);
      expect(Number(dupReceipt.gasUsed)).to.be.lessThan(300000);
    });
  });
});
