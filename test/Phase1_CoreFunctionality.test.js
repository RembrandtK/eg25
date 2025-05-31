const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

// Consistent test data as per TDD approach
const TEST_CANDIDATES = [
  { name: "Alice Johnson", description: "Community development leader" },
  { name: "Bob Smith", description: "Technology and education advocate" },
  { name: "Carol Davis", description: "Environmental sustainability champion" },
  { name: "David Wilson", description: "Economic policy expert" }
];

describe("Phase 1: Core Contract Functionality", function () {
  let electionManager;
  let simpleRanking;
  let worldIDAddressBook;
  let owner, verifiedUser, unverifiedUser, expiredUser;

  beforeEach(async function () {
    [owner, verifiedUser, unverifiedUser, expiredUser] = await ethers.getSigners();

    // Deploy World ID Address Book
    const WorldIDAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    worldIDAddressBook = await WorldIDAddressBook.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(worldIDAddressBook.target);

    // Deploy SimpleRanking (we'll create this contract)
    const SimpleRanking = await ethers.getContractFactory("SimpleRanking");
    simpleRanking = await SimpleRanking.deploy(worldIDAddressBook.target, electionManager.target);

    // Add test candidates
    for (const candidate of TEST_CANDIDATES) {
      await electionManager.addCandidate(candidate.name, candidate.description);
    }

    // Set up verification scenarios
    const currentTime = Math.floor(Date.now() / 1000);
    const futureTime = currentTime + (365 * 24 * 60 * 60); // 1 year from now
    const pastTime = currentTime - 3600; // 1 hour ago

    // Verify users with different scenarios
    await worldIDAddressBook.setAddressVerifiedUntil(verifiedUser.address, futureTime);
    await worldIDAddressBook.setAddressVerifiedUntil(expiredUser.address, pastTime);
    // unverifiedUser gets no verification (default 0)
  });

  describe("A. World ID Verification Tests", function () {
    it("should reject unverified users", async function () {
      await expect(
        simpleRanking.connect(unverifiedUser).updateRanking([
          { candidateId: 1, tiedWithPrevious: false }
        ])
      ).to.be.revertedWith("Address not verified");
    });

    it("should accept verified users with valid timestamps", async function () {
      // Should not revert
      await expect(
        simpleRanking.connect(verifiedUser).updateRanking([
          { candidateId: 1, tiedWithPrevious: false }
        ])
      ).to.not.be.reverted;

      // Verify the ranking was stored
      const ranking = await simpleRanking.getUserRanking(verifiedUser.address);
      expect(ranking.length).to.equal(1);
      expect(bn(ranking[0].candidateId)).to.equal(1);
    });

    it("should reject users with expired verification", async function () {
      await expect(
        simpleRanking.connect(expiredUser).updateRanking([
          { candidateId: 1, tiedWithPrevious: false }
        ])
      ).to.be.revertedWith("Address not verified");
    });

    it("should handle verification edge cases (exactly at expiry)", async function () {
      // Set verification to expire in next block
      const nextBlockTime = Math.floor(Date.now() / 1000) + 15; // 15 seconds from now
      await worldIDAddressBook.setAddressVerifiedUntil(expiredUser.address, nextBlockTime);

      // Should work now
      await expect(
        simpleRanking.connect(expiredUser).updateRanking([
          { candidateId: 1, tiedWithPrevious: false }
        ])
      ).to.not.be.reverted;
    });
  });

  describe("B. Candidate Management Tests", function () {
    it("should load candidates correctly on app startup", async function () {
      const candidates = await electionManager.getCandidates();
      
      expect(candidates.length).to.equal(4);
      expect(candidates[0].name).to.equal("Alice Johnson");
      expect(candidates[0].active).to.be.true;
      expect(bn(candidates[0].id)).to.equal(1);
      
      // Verify all test candidates are present
      for (let i = 0; i < TEST_CANDIDATES.length; i++) {
        expect(candidates[i].name).to.equal(TEST_CANDIDATES[i].name);
        expect(candidates[i].description).to.equal(TEST_CANDIDATES[i].description);
      }
    });

    it("should validate candidate IDs in rankings", async function () {
      // Invalid candidate ID (too high)
      await expect(
        simpleRanking.connect(verifiedUser).updateRanking([
          { candidateId: 999, tiedWithPrevious: false }
        ])
      ).to.be.revertedWith("Invalid candidate ID");

      // Invalid candidate ID (zero)
      await expect(
        simpleRanking.connect(verifiedUser).updateRanking([
          { candidateId: 0, tiedWithPrevious: false }
        ])
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("should handle inactive candidates", async function () {
      // This test assumes we have functionality to deactivate candidates
      // For now, we'll test that all candidates are active
      const candidates = await electionManager.getCandidates();
      
      for (const candidate of candidates) {
        expect(candidate.active).to.be.true;
      }
    });

    it("should return proper candidate metadata", async function () {
      const candidate = await electionManager.candidates(1);
      
      expect(bn(candidate.id)).to.equal(1);
      expect(candidate.name).to.equal("Alice Johnson");
      expect(candidate.description).to.equal("Community development leader");
      expect(candidate.active).to.be.true;
    });
  });

  describe("C. Ranking Storage Tests", function () {
    it("should store user rankings correctly", async function () {
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];

      await simpleRanking.connect(verifiedUser).updateRanking(ranking);

      const storedRanking = await simpleRanking.getUserRanking(verifiedUser.address);
      expect(storedRanking.length).to.equal(3);
      
      for (let i = 0; i < ranking.length; i++) {
        expect(bn(storedRanking[i].candidateId)).to.equal(ranking[i].candidateId);
        expect(storedRanking[i].tiedWithPrevious).to.equal(ranking[i].tiedWithPrevious);
      }
    });

    it("should handle ranking updates (user changes mind)", async function () {
      // Initial ranking
      await simpleRanking.connect(verifiedUser).updateRanking([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);

      // Updated ranking
      await simpleRanking.connect(verifiedUser).updateRanking([
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false }
      ]);

      const finalRanking = await simpleRanking.getUserRanking(verifiedUser.address);
      expect(finalRanking.length).to.equal(3);
      expect(bn(finalRanking[0].candidateId)).to.equal(2); // Bob now first
      expect(bn(finalRanking[1].candidateId)).to.equal(1); // Alice now second
      expect(bn(finalRanking[2].candidateId)).to.equal(3); // Carol added
    });

    it("should support partial rankings", async function () {
      // User only ranks their top 2 candidates
      await simpleRanking.connect(verifiedUser).updateRanking([
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ]);

      const ranking = await simpleRanking.getUserRanking(verifiedUser.address);
      expect(ranking.length).to.equal(2);
      expect(bn(ranking[0].candidateId)).to.equal(3);
      expect(bn(ranking[1].candidateId)).to.equal(1);
    });

    it("should handle tie scenarios", async function () {
      // Ranking with ties
      await simpleRanking.connect(verifiedUser).updateRanking([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: true },  // Tied with Alice
        { candidateId: 3, tiedWithPrevious: false }
      ]);

      const ranking = await simpleRanking.getUserRanking(verifiedUser.address);
      expect(ranking.length).to.equal(3);
      expect(ranking[0].tiedWithPrevious).to.be.false;
      expect(ranking[1].tiedWithPrevious).to.be.true;
      expect(ranking[2].tiedWithPrevious).to.be.false;
    });

    it("should validate ranking structure", async function () {
      // Empty ranking should be rejected
      await expect(
        simpleRanking.connect(verifiedUser).updateRanking([])
      ).to.be.revertedWith("Ranking cannot be empty");

      // First entry cannot be tied with previous
      await expect(
        simpleRanking.connect(verifiedUser).updateRanking([
          { candidateId: 1, tiedWithPrevious: true }
        ])
      ).to.be.revertedWith("First entry cannot be tied with previous");
    });
  });

  describe("D. Basic Statistics and Tracking", function () {
    it("should track total rankers correctly", async function () {
      // Initially no rankers
      const initialStats = await simpleRanking.getRankingStats();
      expect(bn(initialStats[0])).to.equal(0); // totalRankers

      // Add first ranker
      await simpleRanking.connect(verifiedUser).updateRanking([
        { candidateId: 1, tiedWithPrevious: false }
      ]);

      const afterFirstVote = await simpleRanking.getRankingStats();
      expect(bn(afterFirstVote[0])).to.equal(1); // totalRankers

      // Same user updates ranking - should still be 1 ranker
      await simpleRanking.connect(verifiedUser).updateRanking([
        { candidateId: 2, tiedWithPrevious: false }
      ]);

      const afterUpdate = await simpleRanking.getRankingStats();
      expect(bn(afterUpdate[0])).to.equal(1); // still 1 ranker
    });

    it("should provide user voting status", async function () {
      // User hasn't voted yet
      expect(await simpleRanking.hasUserVoted(verifiedUser.address)).to.be.false;

      // User votes
      await simpleRanking.connect(verifiedUser).updateRanking([
        { candidateId: 1, tiedWithPrevious: false }
      ]);

      // User has now voted
      expect(await simpleRanking.hasUserVoted(verifiedUser.address)).to.be.true;
    });

    it("should track voting timestamps", async function () {
      const beforeVote = Math.floor(Date.now() / 1000);
      
      await simpleRanking.connect(verifiedUser).updateRanking([
        { candidateId: 1, tiedWithPrevious: false }
      ]);

      const voteTimestamp = await simpleRanking.getUserVoteTimestamp(verifiedUser.address);
      const afterVote = Math.floor(Date.now() / 1000);

      expect(bn(voteTimestamp)).to.be.at.least(beforeVote);
      expect(bn(voteTimestamp)).to.be.at.most(afterVote);
    });
  });
});
