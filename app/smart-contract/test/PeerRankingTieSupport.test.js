const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("PeerRanking Tie Support Tests", function () {
  let peerRanking;
  let electionManager;
  let mockAddressBook;
  let owner, voter1, voter2, voter3;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();

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

    await mockAddressBook.setAddressVerifiedUntil(owner.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter1.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter2.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter3.address, verifiedUntil);

    // Add test candidates
    await electionManager.addCandidate("Alice Johnson", "Leader");
    await electionManager.addCandidate("Bob Smith", "Innovator");
    await electionManager.addCandidate("Carol Davis", "Environmentalist");
    await electionManager.addCandidate("David Wilson", "Economist");
  });

  describe("Tie Structure and Validation", function () {
    it("Should accept valid tie structures", async function () {
      // Alice > Bob = Carol > David
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice (1st place)
        { candidateId: 2, tiedWithPrevious: false }, // Bob (2nd place)
        { candidateId: 3, tiedWithPrevious: true },  // Carol (tied for 2nd)
        { candidateId: 4, tiedWithPrevious: false }  // David (4th place)
      ];

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Verify ranking was stored
      const storedRanking = await peerRanking.getUserRanking(voter1.address);
      expect(storedRanking.length).to.equal(4);
      expect(bn(storedRanking[0].candidateId)).to.equal(1);
      expect(storedRanking[0].tiedWithPrevious).to.be.false;
      expect(bn(storedRanking[2].candidateId)).to.equal(3);
      expect(storedRanking[2].tiedWithPrevious).to.be.true;
    });

    it("Should reject first entry tied with previous", async function () {
      const ranking = [
        { candidateId: 1, tiedWithPrevious: true }, // Invalid: first cannot be tied
        { candidateId: 2, tiedWithPrevious: false }
      ];

      await expect(
        peerRanking.connect(voter1).updateRanking(ranking)
      ).to.be.revertedWith("First entry cannot be tied with previous");
    });

    it("Should handle complex tie scenarios", async function () {
      // Alice = Bob > Carol = David = Eve (if we had 5 candidates)
      // For now: Alice = Bob > Carol = David
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice (1st place)
        { candidateId: 2, tiedWithPrevious: true },  // Bob (tied for 1st)
        { candidateId: 3, tiedWithPrevious: false }, // Carol (3rd place)
        { candidateId: 4, tiedWithPrevious: true }   // David (tied for 3rd)
      ];

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Verify rank values
      const MAX_RANK = await peerRanking.MAX_RANK();
      expect(await peerRanking.getUserCandidateRank(voter1.address, 1)).to.equal(MAX_RANK); // Alice
      expect(await peerRanking.getUserCandidateRank(voter1.address, 2)).to.equal(MAX_RANK); // Bob (same as Alice)
      expect(await peerRanking.getUserCandidateRank(voter1.address, 3)).to.equal(MAX_RANK - 1n); // Carol
      expect(await peerRanking.getUserCandidateRank(voter1.address, 4)).to.equal(MAX_RANK - 1n); // David (same as Carol)
    });
  });

  describe("Pairwise Comparisons with Ties", function () {
    it("Should not generate comparisons between tied candidates", async function () {
      // Alice > Bob = Carol > David
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice (1st)
        { candidateId: 2, tiedWithPrevious: false }, // Bob (2nd)
        { candidateId: 3, tiedWithPrevious: true },  // Carol (tied for 2nd)
        { candidateId: 4, tiedWithPrevious: false }  // David (4th)
      ];

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Alice should beat Bob and Carol (both tied for 2nd)
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(1); // Alice > Carol

      // Bob and Carol should NOT have comparisons between them (tied)
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(0); // Bob vs Carol: no preference
      expect(bn(await peerRanking.getComparisonCount(3, 2))).to.equal(0); // Carol vs Bob: no preference

      // Both Bob and Carol should beat David
      expect(bn(await peerRanking.getComparisonCount(2, 4))).to.equal(1); // Bob > David
      expect(bn(await peerRanking.getComparisonCount(3, 4))).to.equal(1); // Carol > David
    });

    it("Should handle multiple voters with different tie patterns", async function () {
      // Voter 1: Alice > Bob = Carol > David
      const ranking1 = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: true },
        { candidateId: 4, tiedWithPrevious: false }
      ];

      // Voter 2: Bob > Alice = David > Carol
      const ranking2 = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: true },
        { candidateId: 3, tiedWithPrevious: false }
      ];

      await peerRanking.connect(voter1).updateRanking(ranking1);
      await peerRanking.connect(voter2).updateRanking(ranking2);

      // Alice vs Bob: 1-1 (voter1: Alice>Bob, voter2: Bob>Alice)
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1);
      expect(bn(await peerRanking.getComparisonCount(2, 1))).to.equal(1);

      // Alice vs Carol: 2-0 (voter1: Alice>Carol, voter2: Alice=David>Carol)
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(2);
      expect(bn(await peerRanking.getComparisonCount(3, 1))).to.equal(0);
    });
  });



  describe("User Preference Function with Ties", function () {
    it("Should return 0 for tied candidates", async function () {
      // Alice > Bob = Carol > David
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: true },
        { candidateId: 4, tiedWithPrevious: false }
      ];

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Alice vs Bob: Alice preferred
      expect(await peerRanking.getUserPreference(voter1.address, 1, 2)).to.equal(1);

      // Bob vs Carol: Tied (should return 0)
      expect(await peerRanking.getUserPreference(voter1.address, 2, 3)).to.equal(0);
      expect(await peerRanking.getUserPreference(voter1.address, 3, 2)).to.equal(0);

      // Bob vs David: Bob preferred
      expect(await peerRanking.getUserPreference(voter1.address, 2, 4)).to.equal(1);
    });
  });

  describe("Real-world Tie Scenarios", function () {
    it("Should handle realistic election with ties", async function () {
      console.log("\n=== Realistic Election with Ties ===");

      // Voter 1: Strong preference for Alice, ties others
      const voter1Ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice (clear favorite)
        { candidateId: 2, tiedWithPrevious: false }, // Bob
        { candidateId: 3, tiedWithPrevious: true },  // Carol (tied with Bob)
        { candidateId: 4, tiedWithPrevious: true }   // David (tied with Bob & Carol)
      ];

      // Voter 2: Prefers Bob, ties Alice and Carol
      const voter2Ranking = [
        { candidateId: 2, tiedWithPrevious: false }, // Bob (favorite)
        { candidateId: 1, tiedWithPrevious: false }, // Alice
        { candidateId: 3, tiedWithPrevious: true },  // Carol (tied with Alice)
        { candidateId: 4, tiedWithPrevious: false }  // David (last)
      ];

      // Voter 3: Traditional ranking (no ties)
      const voter3Ranking = [
        { candidateId: 3, tiedWithPrevious: false }, // Carol
        { candidateId: 1, tiedWithPrevious: false }, // Alice
        { candidateId: 4, tiedWithPrevious: false }, // David
        { candidateId: 2, tiedWithPrevious: false }  // Bob
      ];

      await peerRanking.connect(voter1).updateRanking(voter1Ranking);
      await peerRanking.connect(voter2).updateRanking(voter2Ranking);
      await peerRanking.connect(voter3).updateRanking(voter3Ranking);

      console.log("✓ All voters submitted rankings with ties");

      // Note: getCondorcetWinner() is deprecated and always returns false
      // Real Condorcet analysis should be done off-chain using the comparison matrix
      const matrix = await peerRanking.getFullComparisonMatrix();
      console.log("✓ Pairwise comparison matrix available for off-chain analysis");

      // Show key comparisons
      console.log("\n--- Key Pairwise Results ---");
      const pairs = [[1, 2], [1, 3], [2, 3], [3, 4]];
      
      for (const [a, b] of pairs) {
        const aWins = await peerRanking.getComparisonCount(a, b);
        const bWins = await peerRanking.getComparisonCount(b, a);
        console.log(`Candidate ${a} vs ${b}: ${bn(aWins)}-${bn(bWins)}`);
      }

      // Test should complete successfully regardless of winner
      expect(true).to.be.true;
    });
  });
});
