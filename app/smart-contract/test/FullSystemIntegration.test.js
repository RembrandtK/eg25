const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("Full System Integration Tests", function () {
  let electionManager;
  let peerRanking;
  let mockAddressBook;
  let owner, voter1, voter2, voter3, voter4, voter5;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();

    // Deploy mock address book
    const MockAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    mockAddressBook = await MockAddressBook.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockAddressBook.target);

    // Deploy PeerRanking
    const PeerRanking = await ethers.getContractFactory("PeerRanking");
    peerRanking = await PeerRanking.deploy(mockAddressBook.target, electionManager.target);

    // Verify test addresses
    const verificationDuration = 365 * 24 * 60 * 60; // 1 year
    const currentTime = Math.floor(Date.now() / 1000);
    const verifiedUntil = currentTime + verificationDuration;

    const voters = [voter1, voter2, voter3, voter4, voter5];
    for (const voter of voters) {
      await mockAddressBook.setAddressVerifiedUntil(voter.address, verifiedUntil);
    }

    // Add test candidates matching the real deployment
    const candidates = [
      { name: "Alice Johnson", description: "Experienced leader focused on community development and transparency" },
      { name: "Bob Smith", description: "Innovation advocate with a background in technology and education" },
      { name: "Carol Davis", description: "Environmental champion committed to sustainable policies" },
      { name: "David Wilson", description: "Economic policy expert with focus on fair growth and opportunity" }
    ];

    for (const candidate of candidates) {
      await electionManager.addCandidate(candidate.name, candidate.description);
    }
  });

  describe("Complete Voting Workflow", function () {
    it("Should handle complete voting workflow from start to finish", async function () {
      console.log("\n=== Complete Voting Workflow Test ===");
      
      // Step 1: Verify initial state
      const initialCandidates = await electionManager.getCandidates();
      expect(initialCandidates.length).to.equal(4);
      
      const initialRankers = await peerRanking.getTotalRankers();
      expect(bn(initialRankers)).to.equal(0);
      
      console.log("✓ Initial state verified");
      
      // Step 2: Multiple voters submit rankings
      const votingScenarios = [
        { voter: voter1, ranking: [1, 2, 3, 4], description: "Alice > Bob > Carol > David" },
        { voter: voter2, ranking: [2, 1, 4, 3], description: "Bob > Alice > David > Carol" },
        { voter: voter3, ranking: [1, 3, 2, 4], description: "Alice > Carol > Bob > David" },
        { voter: voter4, ranking: [3, 1, 4, 2], description: "Carol > Alice > David > Bob" },
        { voter: voter5, ranking: [1, 4, 3, 2], description: "Alice > David > Carol > Bob" }
      ];
      
      for (const scenario of votingScenarios) {
        const tx = await peerRanking.connect(scenario.voter).updateRanking(scenario.ranking);
        const receipt = await tx.wait();
        
        console.log(`✓ ${scenario.description} - Gas: ${Number(receipt.gasUsed).toLocaleString()}`);
        
        // Verify ranking was stored
        const storedRanking = await peerRanking.getUserRanking(scenario.voter.address);
        expect(storedRanking.map(id => bn(id))).to.deep.equal(scenario.ranking);
      }
      
      // Step 3: Verify final state
      const finalRankers = await peerRanking.getTotalRankers();
      expect(bn(finalRankers)).to.equal(5);
      
      console.log("✓ All votes recorded successfully");
      
      // Step 4: Analyze results
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      const [totalRankers, totalComparisons, candidateCount] = await peerRanking.getRankingStats();
      
      console.log(`✓ Results: ${hasWinner ? `Winner is candidate ${bn(winner)}` : 'No Condorcet winner'}`);
      console.log(`✓ Stats: ${bn(totalRankers)} rankers, ${bn(totalComparisons)} comparisons, ${bn(candidateCount)} candidates`);
      
      // Step 5: Verify pairwise comparisons
      console.log("\n--- Pairwise Comparison Results ---");
      for (let i = 1; i <= 4; i++) {
        for (let j = 1; j <= 4; j++) {
          if (i !== j) {
            const count = await peerRanking.getComparisonCount(i, j);
            if (bn(count) > 0) {
              console.log(`Candidate ${i} > Candidate ${j}: ${bn(count)} votes`);
            }
          }
        }
      }
    });

    it("Should handle ranking updates correctly", async function () {
      console.log("\n=== Ranking Update Test ===");
      
      // Initial ranking
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]);
      console.log("✓ Initial ranking submitted");
      
      // Verify initial comparisons
      const initialAliceBob = await peerRanking.getComparisonCount(1, 2);
      expect(bn(initialAliceBob)).to.equal(1);
      
      // Update ranking (reverse order)
      await peerRanking.connect(voter1).updateRanking([4, 3, 2, 1]);
      console.log("✓ Ranking updated");
      
      // Verify comparisons updated correctly
      const updatedAliceBob = await peerRanking.getComparisonCount(1, 2);
      const updatedBobAlice = await peerRanking.getComparisonCount(2, 1);
      
      expect(bn(updatedAliceBob)).to.equal(0); // Alice no longer beats Bob
      expect(bn(updatedBobAlice)).to.equal(1); // Bob now beats Alice
      
      // Should still have only 1 ranker
      const totalRankers = await peerRanking.getTotalRankers();
      expect(bn(totalRankers)).to.equal(1);
      
      console.log("✓ Update handled correctly");
    });

    it("Should handle partial rankings correctly", async function () {
      console.log("\n=== Partial Ranking Test ===");
      
      // Voter 1: Full ranking
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]);
      
      // Voter 2: Partial ranking (only top 2)
      await peerRanking.connect(voter2).updateRanking([2, 1]);
      
      // Voter 3: Different partial ranking
      await peerRanking.connect(voter3).updateRanking([3, 4, 1]);
      
      console.log("✓ Mixed full and partial rankings submitted");
      
      // Verify comparisons are correct
      // Voter1: [1,2,3,4] → Alice>Bob, Alice>Carol, Alice>David, Bob>Carol, Bob>David, Carol>David
      // Voter2: [2,1] → Bob>Alice
      // Voter3: [3,4,1] → Carol>David, Carol>Alice, David>Alice

      const aliceBob = await peerRanking.getComparisonCount(1, 2); // voter1: Alice>Bob = 1
      const bobAlice = await peerRanking.getComparisonCount(2, 1); // voter2: Bob>Alice = 1
      const carolDavid = await peerRanking.getComparisonCount(3, 4); // voter1 + voter3: Carol>David = 2

      console.log(`Alice > Bob: ${bn(aliceBob)}, Bob > Alice: ${bn(bobAlice)}, Carol > David: ${bn(carolDavid)}`);

      expect(bn(aliceBob)).to.equal(1);
      expect(bn(bobAlice)).to.equal(1);
      expect(bn(carolDavid)).to.equal(2); // Both voter1 and voter3 have Carol > David
      
      console.log("✓ Partial rankings handled correctly");
    });
  });

  describe("Error Handling and Edge Cases", function () {
    it("Should handle inactive candidates gracefully", async function () {
      // This test would require adding functionality to deactivate candidates
      // For now, we'll test with the current active candidates
      const candidates = await electionManager.getCandidates();
      
      for (const candidate of candidates) {
        expect(candidate.active).to.be.true;
      }
      
      console.log("✓ All candidates are active as expected");
    });

    it("Should prevent unverified users from voting", async function () {
      const [, , , , , , unverifiedUser] = await ethers.getSigners();
      
      await expect(
        peerRanking.connect(unverifiedUser).updateRanking([1, 2, 3])
      ).to.be.revertedWith("Address not verified");
      
      console.log("✓ Unverified user correctly rejected");
    });

    it("Should handle invalid candidate IDs", async function () {
      await expect(
        peerRanking.connect(voter1).updateRanking([1, 2, 5]) // 5 doesn't exist
      ).to.be.revertedWith("Invalid candidate ID");
      
      await expect(
        peerRanking.connect(voter1).updateRanking([0, 1, 2]) // 0 is invalid
      ).to.be.revertedWith("Invalid candidate ID");
      
      console.log("✓ Invalid candidate IDs correctly rejected");
    });

    it("Should handle empty rankings", async function () {
      await expect(
        peerRanking.connect(voter1).updateRanking([])
      ).to.be.revertedWith("Ranking cannot be empty");
      
      console.log("✓ Empty rankings correctly rejected");
    });
  });

  describe("Performance and Scalability", function () {
    it("Should handle concurrent voting efficiently", async function () {
      console.log("\n=== Concurrent Voting Test ===");
      
      const voters = [voter1, voter2, voter3, voter4, voter5];
      const rankings = [
        [1, 2, 3, 4],
        [2, 3, 4, 1],
        [3, 4, 1, 2],
        [4, 1, 2, 3],
        [1, 3, 2, 4]
      ];
      
      // Submit all votes
      const promises = voters.map((voter, index) => 
        peerRanking.connect(voter).updateRanking(rankings[index])
      );
      
      const results = await Promise.all(promises);
      
      // Verify all transactions succeeded
      for (let i = 0; i < results.length; i++) {
        const receipt = await results[i].wait();
        expect(receipt.status).to.equal(1);
        console.log(`Voter ${i + 1}: ${Number(receipt.gasUsed).toLocaleString()} gas`);
      }
      
      // Verify final state
      const totalRankers = await peerRanking.getTotalRankers();
      expect(bn(totalRankers)).to.equal(5);
      
      console.log("✓ Concurrent voting handled successfully");
    });

    it("Should provide consistent results across multiple queries", async function () {
      // Set up voting scenario
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]);
      await peerRanking.connect(voter2).updateRanking([1, 3, 2, 4]);
      await peerRanking.connect(voter3).updateRanking([1, 4, 3, 2]);
      
      // Query results multiple times
      const queries = 5;
      const results = [];
      
      for (let i = 0; i < queries; i++) {
        const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
        const stats = await peerRanking.getRankingStats();
        const aliceWins = await peerRanking.getCandidateWinCount(1);
        
        results.push({
          winner: bn(winner),
          hasWinner,
          totalRankers: bn(stats[0]),
          aliceWins: bn(aliceWins)
        });
      }
      
      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).to.deep.equal(results[0]);
      }
      
      console.log("✓ Consistent results across multiple queries");
    });
  });

  describe("Real-world Scenarios", function () {
    it("Should simulate a realistic election scenario", async function () {
      console.log("\n=== Realistic Election Simulation ===");
      
      // Simulate realistic voting patterns
      const realisticVotes = [
        { voter: voter1, ranking: [1, 2, 3, 4], rationale: "Traditional preference order" },
        { voter: voter2, ranking: [2, 1, 4, 3], rationale: "Prefers innovation over tradition" },
        { voter: voter3, ranking: [3, 1, 2, 4], rationale: "Environment-first voter" },
        { voter: voter4, ranking: [1, 3, 4, 2], rationale: "Balanced approach" },
        { voter: voter5, ranking: [4, 2, 1, 3], rationale: "Economy-focused voter" }
      ];
      
      // Submit votes with analysis
      for (const vote of realisticVotes) {
        const tx = await peerRanking.connect(vote.voter).updateRanking(vote.ranking);
        const receipt = await tx.wait();
        
        console.log(`${vote.rationale}: [${vote.ranking.join(', ')}] - ${Number(receipt.gasUsed).toLocaleString()} gas`);
      }
      
      // Analyze final results
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      
      console.log("\n--- Final Election Results ---");
      
      if (hasWinner) {
        const candidates = await electionManager.getCandidates();
        const winnerName = candidates[bn(winner) - 1].name;
        console.log(`🏆 Condorcet Winner: ${winnerName} (Candidate ${bn(winner)})`);
      } else {
        console.log("🤝 No Condorcet winner - requires tie-breaking mechanism");
      }
      
      // Show win counts for all candidates
      console.log("\n--- Candidate Performance ---");
      for (let i = 1; i <= 4; i++) {
        const wins = await peerRanking.getCandidateWinCount(i);
        const candidates = await electionManager.getCandidates();
        const name = candidates[i - 1].name;
        console.log(`${name}: ${bn(wins)}/3 pairwise wins`);
      }
      
      // Show key pairwise comparisons
      console.log("\n--- Key Pairwise Comparisons ---");
      const keyPairs = [[1, 2], [1, 3], [2, 3], [3, 4]];
      
      for (const [a, b] of keyPairs) {
        const aWins = await peerRanking.getComparisonCount(a, b);
        const bWins = await peerRanking.getComparisonCount(b, a);
        const candidates = await electionManager.getCandidates();
        
        console.log(`${candidates[a-1].name} vs ${candidates[b-1].name}: ${bn(aWins)}-${bn(bWins)}`);
      }
    });
  });
});
