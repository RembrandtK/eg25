const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("PeerRanking Contract", function () {
  let peerRanking;
  let electionManager;
  let mockAddressBook;
  let owner, voter1, voter2, voter3, unverifiedUser;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, unverifiedUser] = await ethers.getSigners();

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

    await mockAddressBook.setAddressVerifiedUntil(voter1.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter2.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter3.address, verifiedUntil);

    // Add test candidates
    await electionManager.addCandidate("Alice Johnson", "Leader");
    await electionManager.addCandidate("Bob Smith", "Innovator");
    await electionManager.addCandidate("Carol Davis", "Environmentalist");
    await electionManager.addCandidate("David Wilson", "Economist");
  });

  describe("Deployment", function () {
    it("Should set the correct contracts", async function () {
      expect(await peerRanking.worldAddressBook()).to.equal(mockAddressBook.target);
      expect(await peerRanking.electionManager()).to.equal(electionManager.target);
    });

    it("Should start with zero rankers", async function () {
      expect(bn(await peerRanking.getTotalRankers())).to.equal(0);
    });
  });

  describe("Basic Ranking", function () {
    it("Should allow verified user to submit ranking", async function () {
      const ranking = [1, 2, 3]; // Alice > Bob > Carol

      // Test the transaction succeeds
      const tx = await peerRanking.connect(voter1).updateRanking(ranking);
      await tx.wait();

      const storedRanking = await peerRanking.getUserRanking(voter1.address);
      expect(storedRanking.map(id => bn(id))).to.deep.equal(ranking);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);
    });

    it("Should not allow unverified user to submit ranking", async function () {
      const ranking = [1, 2, 3];

      try {
        await peerRanking.connect(unverifiedUser).updateRanking(ranking);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Address not verified");
      }
    });

    it("Should not allow empty ranking", async function () {
      try {
        await peerRanking.connect(voter1).updateRanking([]);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Ranking cannot be empty");
      }
    });

    it("Should not allow invalid candidate IDs", async function () {
      try {
        await peerRanking.connect(voter1).updateRanking([1, 2, 5]); // 5 doesn't exist
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Invalid candidate ID");
      }

      try {
        await peerRanking.connect(voter1).updateRanking([0, 1, 2]); // 0 is invalid
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Invalid candidate ID");
      }
    });
  });

  describe("Pairwise Comparison Logic", function () {
    it("Should generate correct comparisons for simple ranking", async function () {
      // Ranking: Alice > Bob > Carol (1 > 2 > 3)
      const ranking = [1, 2, 3];

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Expected comparisons: Alice>Bob, Alice>Carol, Bob>Carol
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(1); // Alice > Carol
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(1); // Bob > Carol

      // Reverse comparisons should be 0
      expect(bn(await peerRanking.getComparisonCount(2, 1))).to.equal(0); // Bob > Alice
      expect(bn(await peerRanking.getComparisonCount(3, 1))).to.equal(0); // Carol > Alice
      expect(bn(await peerRanking.getComparisonCount(3, 2))).to.equal(0); // Carol > Bob
    });

    it("Should handle single candidate ranking", async function () {
      const ranking = [1]; // Only Alice

      await peerRanking.connect(voter1).updateRanking(ranking);

      // No comparisons should be generated (check a few pairs)
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(0);
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(0);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);
    });

    it("Should accumulate comparisons from multiple users", async function () {
      // Voter1: Alice > Bob > Carol
      await peerRanking.connect(voter1).updateRanking([1, 2, 3]);

      // Voter2: Alice > Carol > Bob (different order)
      await peerRanking.connect(voter2).updateRanking([1, 3, 2]);

      // Alice > Bob: 2 votes (voter1, voter2)
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(2);

      // Alice > Carol: 2 votes (voter1, voter2)
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(2);

      // Bob > Carol: 1 vote (voter1)
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(1);

      // Carol > Bob: 1 vote (voter2)
      expect(bn(await peerRanking.getComparisonCount(3, 2))).to.equal(1);
    });

    it("Should handle ranking updates correctly", async function () {
      // Initial ranking: Alice > Bob > Carol
      await peerRanking.connect(voter1).updateRanking([1, 2, 3]);

      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(1); // Alice > Carol
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(1); // Bob > Carol

      // Update ranking: Carol > Alice > Bob
      await peerRanking.connect(voter1).updateRanking([3, 1, 2]);

      // New comparisons after update: Carol > Alice, Carol > Bob, Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(3, 1))).to.equal(1); // Carol > Alice (new)
      expect(bn(await peerRanking.getComparisonCount(3, 2))).to.equal(1); // Carol > Bob (new)
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob (still exists)

      // Old comparisons that should be removed
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(0); // Alice > Carol (removed)
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(0); // Bob > Carol (removed)
    });
  });

  describe("Complex Scenarios", function () {
    it("Should handle partial rankings", async function () {
      // Voter1 ranks only 2 candidates: Alice > Bob
      await peerRanking.connect(voter1).updateRanking([1, 2]);

      // Voter2 ranks all 4: Carol > David > Alice > Bob
      await peerRanking.connect(voter2).updateRanking([3, 4, 1, 2]);

      // Alice > Bob should have 2 votes
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(2);

      // Carol > David should have 1 vote (only voter2)
      expect(bn(await peerRanking.getComparisonCount(3, 4))).to.equal(1);

      // Carol > Alice should have 1 vote (only voter2)
      expect(bn(await peerRanking.getComparisonCount(3, 1))).to.equal(1);
    });

    it("Should handle conflicting preferences", async function () {
      // Voter1: Alice > Bob
      await peerRanking.connect(voter1).updateRanking([1, 2]);

      // Voter2: Bob > Alice (opposite preference)
      await peerRanking.connect(voter2).updateRanking([2, 1]);

      // Both directions should have 1 vote each
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(2, 1))).to.equal(1); // Bob > Alice
    });

    it("Should track multiple ranking updates per user", async function () {
      // Initial ranking
      await peerRanking.connect(voter1).updateRanking([1, 2, 3]);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);

      // Update ranking (should not increase ranker count)
      await peerRanking.connect(voter1).updateRanking([3, 2, 1]);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);

      // Different user
      await peerRanking.connect(voter2).updateRanking([1, 3, 2]);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(2);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should handle large rankings efficiently", async function () {
      // Test with all 4 candidates
      const ranking = [1, 2, 3, 4];

      const tx = await peerRanking.connect(voter1).updateRanking(ranking);
      const receipt = await tx.wait();

      console.log(`Gas used for 4-candidate ranking: ${receipt.gasUsed.toString()}`);

      // Should be reasonable gas usage (less than 600k for initial ranking)
      expect(Number(receipt.gasUsed)).to.be.lessThan(600000);
    });

    it("Should optimize ranking updates", async function () {
      // Initial ranking
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]);

      // Small update (swap two adjacent candidates)
      const tx = await peerRanking.connect(voter1).updateRanking([1, 3, 2, 4]);
      const receipt = await tx.wait();

      console.log(`Gas used for ranking update: ${receipt.gasUsed.toString()}`);

      // Update should use less gas than initial ranking
      expect(Number(receipt.gasUsed)).to.be.lessThan(250000);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle duplicate candidate IDs gracefully", async function () {
      // This should be handled by the frontend, but test contract behavior
      const ranking = [1, 1, 2]; // Alice appears twice

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Should still generate valid comparisons
      const storedRanking = await peerRanking.getUserRanking(voter1.address);
      expect(storedRanking.length).to.equal(3);
    });

    it("Should handle maximum candidate count", async function () {
      // Add more candidates to test limits
      for (let i = 5; i <= 10; i++) {
        await electionManager.addCandidate(`Candidate ${i}`, `Description ${i}`);
      }

      // Rank all 10 candidates
      const ranking = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const tx = await peerRanking.connect(voter1).updateRanking(ranking);
      const receipt = await tx.wait();

      console.log(`Gas used for 10-candidate ranking: ${receipt.gasUsed.toString()}`);

      // Should still be manageable gas usage (simplified contract should be much more efficient)
      expect(Number(receipt.gasUsed)).to.be.lessThan(500000);
    });
  });
});
