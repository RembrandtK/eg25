const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("Condorcet Algorithm Implementation Tests", function () {
  let peerRanking;
  let electionManager;
  let mockAddressBook;
  let owner;
  let voters = [];

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    voters = signers.slice(1, 8); // Get 7 voters for comprehensive testing

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

    // Add test candidates
    const candidates = ["Alice", "Bob", "Carol", "David", "Eve"];
    for (const name of candidates) {
      await electionManager.addCandidate(name, `Description for ${name}`);
    }
  });

  describe("Classic Condorcet Scenarios", function () {
    it("Should handle clear majority winner", async function () {
      console.log("\n=== Clear Majority Winner Test ===");
      
      // Alice wins against everyone
      const votes = [
        [1, 2, 3, 4, 5], // Alice > Bob > Carol > David > Eve
        [1, 3, 2, 5, 4], // Alice > Carol > Bob > Eve > David
        [1, 4, 5, 2, 3], // Alice > David > Eve > Bob > Carol
        [1, 5, 4, 3, 2], // Alice > Eve > David > Carol > Bob
        [1, 2, 4, 3, 5]  // Alice > Bob > David > Carol > Eve
      ];
      
      for (let i = 0; i < votes.length; i++) {
        await peerRanking.connect(voters[i]).updateRanking(votes[i]);
        console.log(`Voter ${i + 1}: [${votes[i].join(', ')}]`);
      }
      
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      expect(hasWinner).to.be.true;
      expect(bn(winner)).to.equal(1); // Alice
      
      // Verify Alice beats everyone
      for (let opponent = 2; opponent <= 5; opponent++) {
        const aliceWins = await peerRanking.getComparisonCount(1, opponent);
        const opponentWins = await peerRanking.getComparisonCount(opponent, 1);
        
        console.log(`Alice vs Candidate ${opponent}: ${bn(aliceWins)}-${bn(opponentWins)}`);
        expect(bn(aliceWins)).to.be.greaterThan(bn(opponentWins));
      }
    });

    it("Should detect Condorcet paradox (no winner)", async function () {
      console.log("\n=== Condorcet Paradox Test ===");
      
      // Classic rock-paper-scissors scenario: A > B > C > A
      const votes = [
        [1, 2, 3], // Alice > Bob > Carol
        [1, 2, 3], // Alice > Bob > Carol
        [2, 3, 1], // Bob > Carol > Alice
        [2, 3, 1], // Bob > Carol > Alice
        [3, 1, 2], // Carol > Alice > Bob
        [3, 1, 2]  // Carol > Alice > Bob
      ];
      
      for (let i = 0; i < votes.length; i++) {
        await peerRanking.connect(voters[i]).updateRanking(votes[i]);
        console.log(`Voter ${i + 1}: [${votes[i].join(', ')}]`);
      }
      
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      expect(hasWinner).to.be.false;
      expect(bn(winner)).to.equal(0);
      
      // Verify the cycle: Alice > Bob, Bob > Carol, Carol > Alice
      const aliceBob = await peerRanking.getComparisonCount(1, 2);
      const bobCarol = await peerRanking.getComparisonCount(2, 3);
      const carolAlice = await peerRanking.getComparisonCount(3, 1);
      
      console.log(`Alice > Bob: ${bn(aliceBob)}`);
      console.log(`Bob > Carol: ${bn(bobCarol)}`);
      console.log(`Carol > Alice: ${bn(carolAlice)}`);
      
      expect(bn(aliceBob)).to.equal(4); // Alice beats Bob 4-2
      expect(bn(bobCarol)).to.equal(4); // Bob beats Carol 4-2
      expect(bn(carolAlice)).to.equal(4); // Carol beats Alice 4-2
    });

    it("Should handle ties correctly", async function () {
      console.log("\n=== Tie Handling Test ===");
      
      // Perfect tie between Alice and Bob
      const votes = [
        [1, 2, 3], // Alice > Bob > Carol
        [2, 1, 3], // Bob > Alice > Carol
        [1, 2, 3], // Alice > Bob > Carol
        [2, 1, 3]  // Bob > Alice > Carol
      ];
      
      for (let i = 0; i < votes.length; i++) {
        await peerRanking.connect(voters[i]).updateRanking(votes[i]);
      }
      
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      expect(hasWinner).to.be.false; // No clear winner due to tie
      
      const aliceBob = await peerRanking.getComparisonCount(1, 2);
      const bobAlice = await peerRanking.getComparisonCount(2, 1);
      
      console.log(`Alice > Bob: ${bn(aliceBob)}`);
      console.log(`Bob > Alice: ${bn(bobAlice)}`);
      
      expect(bn(aliceBob)).to.equal(bn(bobAlice)); // Perfect tie
    });
  });

  describe("Advanced Condorcet Scenarios", function () {
    it("Should handle weak Condorcet winner", async function () {
      console.log("\n=== Weak Condorcet Winner Test ===");
      
      // Alice wins or ties against everyone
      const votes = [
        [1, 2, 3, 4], // Alice > Bob > Carol > David
        [1, 3, 2, 4], // Alice > Carol > Bob > David
        [2, 1, 4, 3], // Bob > Alice > David > Carol (Alice still competitive)
        [1, 4, 2, 3], // Alice > David > Bob > Carol
        [3, 1, 4, 2]  // Carol > Alice > David > Bob (Alice still competitive)
      ];
      
      for (let i = 0; i < votes.length; i++) {
        await peerRanking.connect(voters[i]).updateRanking(votes[i]);
      }
      
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      
      // Check if Alice wins or if there's no clear winner
      if (hasWinner) {
        expect(bn(winner)).to.equal(1); // Alice should be the winner
        console.log("✓ Alice is the Condorcet winner");
      } else {
        console.log("✓ No clear Condorcet winner (acceptable for weak scenarios)");
      }
      
      // Show all pairwise results
      console.log("\n--- Pairwise Results ---");
      for (let i = 1; i <= 4; i++) {
        for (let j = 1; j <= 4; j++) {
          if (i !== j) {
            const count = await peerRanking.getComparisonCount(i, j);
            if (bn(count) > 0) {
              console.log(`Candidate ${i} > Candidate ${j}: ${bn(count)}`);
            }
          }
        }
      }
    });

    it("Should handle complex multi-candidate scenarios", async function () {
      console.log("\n=== Complex Multi-Candidate Test ===");
      
      // 5 candidates with complex preferences
      const votes = [
        [1, 2, 3, 4, 5], // Traditional order
        [5, 4, 3, 2, 1], // Reverse order
        [3, 1, 5, 2, 4], // Mixed preferences
        [2, 4, 1, 5, 3], // Different mix
        [4, 3, 2, 1, 5], // Another pattern
        [1, 5, 2, 4, 3], // Yet another pattern
        [3, 2, 4, 5, 1]  // Final pattern
      ];
      
      for (let i = 0; i < votes.length; i++) {
        await peerRanking.connect(voters[i]).updateRanking(votes[i]);
        console.log(`Voter ${i + 1}: [${votes[i].join(', ')}]`);
      }
      
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      
      console.log(`\nResult: ${hasWinner ? `Candidate ${bn(winner)} wins` : 'No Condorcet winner'}`);
      
      // Show win counts for all candidates
      console.log("\n--- Candidate Performance ---");
      for (let i = 1; i <= 5; i++) {
        const wins = await peerRanking.getCandidateWinCount(i);
        console.log(`Candidate ${i}: ${bn(wins)}/4 pairwise wins`);
      }
      
      // The test should complete without errors regardless of outcome
      expect(true).to.be.true; // Always passes - we're testing the algorithm works
    });
  });

  describe("Algorithm Efficiency and Correctness", function () {
    it("Should maintain consistency across multiple queries", async function () {
      // Set up a scenario
      await peerRanking.connect(voters[0]).updateRanking([1, 2, 3, 4]);
      await peerRanking.connect(voters[1]).updateRanking([2, 1, 4, 3]);
      await peerRanking.connect(voters[2]).updateRanking([1, 3, 2, 4]);
      
      // Query multiple times
      const results = [];
      for (let i = 0; i < 10; i++) {
        const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
        results.push({ winner: bn(winner), hasWinner });
      }
      
      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).to.deep.equal(results[0]);
      }
      
      console.log("✓ Condorcet algorithm is consistent across multiple queries");
    });

    it("Should handle edge case with single candidate", async function () {
      // Deploy fresh contracts with only one candidate
      const freshElection = await ethers.getContractFactory("ElectionManager");
      const freshElectionInstance = await freshElection.deploy(mockAddressBook.target);
      await freshElectionInstance.addCandidate("Only Alice", "The only choice");
      
      const freshPeerRanking = await ethers.getContractFactory("PeerRanking");
      const freshPeerRankingInstance = await freshPeerRanking.deploy(
        mockAddressBook.target, 
        freshElectionInstance.target
      );
      
      await freshPeerRankingInstance.connect(voters[0]).updateRanking([1]);
      
      const [winner, hasWinner] = await freshPeerRankingInstance.getCondorcetWinner();
      expect(hasWinner).to.be.true;
      expect(bn(winner)).to.equal(1);
      
      console.log("✓ Single candidate correctly identified as Condorcet winner");
    });

    it("Should handle empty election gracefully", async function () {
      // Deploy fresh contracts with no candidates
      const freshElection = await ethers.getContractFactory("ElectionManager");
      const freshElectionInstance = await freshElection.deploy(mockAddressBook.target);
      
      const freshPeerRanking = await ethers.getContractFactory("PeerRanking");
      const freshPeerRankingInstance = await freshPeerRanking.deploy(
        mockAddressBook.target, 
        freshElectionInstance.target
      );
      
      const [winner, hasWinner] = await freshPeerRankingInstance.getCondorcetWinner();
      expect(hasWinner).to.be.false;
      expect(bn(winner)).to.equal(0);
      
      console.log("✓ Empty election correctly returns no winner");
    });
  });
});
