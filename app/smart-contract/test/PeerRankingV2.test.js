const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("PeerRanking V2 Contract (Efficient Vote Tracking)", function () {
  let peerRanking;
  let electionManager;
  let mockAddressBook;
  let owner, voter1, voter2, voter3, unverifiedUser;

  const MAX_RANK = ethers.MaxUint256;

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
      expect(await peerRanking.MAX_RANK()).to.equal(MAX_RANK);
    });

    it("Should start with zero rankers", async function () {
      expect(bn(await peerRanking.getTotalRankers())).to.equal(0);
    });
  });

  describe("Rank Value System", function () {
    it("Should assign correct rank values", async function () {
      const ranking = [1, 2, 3]; // Alice > Bob > Carol

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Check rank values (MAX_RANK, MAX_RANK-1, MAX_RANK-2)
      expect(await peerRanking.getUserCandidateRank(voter1.address, 1)).to.equal(MAX_RANK); // Alice: 1st
      expect(await peerRanking.getUserCandidateRank(voter1.address, 2)).to.equal(MAX_RANK - 1n); // Bob: 2nd
      expect(await peerRanking.getUserCandidateRank(voter1.address, 3)).to.equal(MAX_RANK - 2n); // Carol: 3rd
      expect(bn(await peerRanking.getUserCandidateRank(voter1.address, 4))).to.equal(0); // David: unranked
    });

    it("Should handle user preferences correctly", async function () {
      const ranking = [1, 2, 3]; // Alice > Bob > Carol

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Test preference function
      expect(bn(await peerRanking.getUserPreference(voter1.address, 1, 2))).to.equal(1);  // Alice > Bob
      expect(bn(await peerRanking.getUserPreference(voter1.address, 2, 1))).to.equal(-1); // Bob < Alice
      expect(bn(await peerRanking.getUserPreference(voter1.address, 1, 4))).to.equal(1);  // Alice > David (unranked)
      expect(bn(await peerRanking.getUserPreference(voter1.address, 4, 1))).to.equal(-1); // David < Alice
      expect(bn(await peerRanking.getUserPreference(voter1.address, 4, 4))).to.equal(0);  // David = David
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

  describe("Algorithm Efficiency", function () {
    it("Should handle partial rankings efficiently", async function () {
      // Voter1 ranks only 2 candidates: Alice > Bob
      await peerRanking.connect(voter1).updateRanking([1, 2]);

      // Check rank values
      expect(await peerRanking.getUserCandidateRank(voter1.address, 1)).to.equal(MAX_RANK); // Alice: 1st
      expect(await peerRanking.getUserCandidateRank(voter1.address, 2)).to.equal(MAX_RANK - 1n); // Bob: 2nd
      expect(bn(await peerRanking.getUserCandidateRank(voter1.address, 3))).to.equal(0); // Carol: unranked
      expect(bn(await peerRanking.getUserCandidateRank(voter1.address, 4))).to.equal(0); // David: unranked

      // Only one comparison should exist
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(0); // No Alice > Carol
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(0); // No Bob > Carol
    });

    it("Should provide easy comparison for algorithms", async function () {
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]); // Alice > Bob > Carol > David

      // Algorithm can easily check: if rank(A) > rank(B) then A preferred
      const aliceRank = await peerRanking.getUserCandidateRank(voter1.address, 1);
      const bobRank = await peerRanking.getUserCandidateRank(voter1.address, 2);
      const carolRank = await peerRanking.getUserCandidateRank(voter1.address, 3);
      const davidRank = await peerRanking.getUserCandidateRank(voter1.address, 4);

      // Verify ranking order
      expect(aliceRank > bobRank).to.be.true;
      expect(bobRank > carolRank).to.be.true;
      expect(carolRank > davidRank).to.be.true;
      expect(davidRank > 0).to.be.true; // All ranked candidates have rank > 0
    });
  });

  describe("Gas Optimization", function () {
    it("Should be more efficient than previous version", async function () {
      const ranking = [1, 2, 3, 4];

      const tx = await peerRanking.connect(voter1).updateRanking(ranking);
      const receipt = await tx.wait();

      console.log(`Gas used for 4-candidate ranking (V2): ${receipt.gasUsed.toString()}`);

      // Should be more efficient than the old version
      expect(Number(receipt.gasUsed)).to.be.lessThan(600000);
    });

    it("Should handle ranking updates efficiently", async function () {
      // Initial ranking
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]);

      // Update ranking
      const tx = await peerRanking.connect(voter1).updateRanking([4, 3, 2, 1]);
      const receipt = await tx.wait();

      console.log(`Gas used for ranking update (V2): ${receipt.gasUsed.toString()}`);

      // Update should be reasonably efficient
      expect(Number(receipt.gasUsed)).to.be.lessThan(400000);
    });
  });

  describe("Error Handling", function () {
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
    });
  });
});
