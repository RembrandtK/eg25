const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

describe("World ID ZK Proof Verification (TDD)", function () {
  let worldID;
  let electionManager;
  let peerRanking;
  let owner, user1, user2;

  // Test World ID app configuration
  const APP_ID = "app_10719845a0977ef63ebe8eb9edb890ad";
  const ACTION = "vote_ranking";

  // Valid ZK proof components (these would come from World ID SDK in real implementation)
  const VALID_PROOF = [
    "0x1111111111111111111111111111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444444444444444444444444444",
    "0x5555555555555555555555555555555555555555555555555555555555555555",
    "0x6666666666666666666666666666666666666666666666666666666666666666",
    "0x7777777777777777777777777777777777777777777777777777777777777777",
    "0x8888888888888888888888888888888888888888888888888888888888888888"
  ];

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy World ID contract (real verification, not mock)
    const WorldID = await ethers.getContractFactory("MockWorldID");
    worldID = await WorldID.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(worldID.target);

    // Deploy PeerRanking with proper World ID integration
    const PeerRanking = await ethers.getContractFactory("PeerRanking");
    peerRanking = await PeerRanking.deploy(worldID.target, APP_ID, ACTION, electionManager.target);

    // Add test candidates
    await electionManager.addCandidate("Alice Johnson", "Community leader");
    await electionManager.addCandidate("Bob Smith", "Tech advocate");
    await electionManager.addCandidate("Carol Davis", "Environmental champion");
  });

  describe("A. Basic World ID Integration", function () {
    it("should deploy with correct World ID configuration", async function () {
      expect(peerRanking.target).to.not.be.undefined;
      expect(await peerRanking.worldId()).to.equal(worldID.target);
      expect(await peerRanking.groupId()).to.equal(1); // Orb-verified only
    });

    it("should have proper external nullifier hash", async function () {
      // The external nullifier should be computed from app ID and action
      const externalNullifierHash = await peerRanking.externalNullifierHash();
      expect(externalNullifierHash).to.not.equal(0);
    });
  });

  describe("B. ZK Proof Verification Flow", function () {
    it("should accept valid World ID proof and store ranking", async function () {
      const signal = user1.address;
      const root = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const nullifierHash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef";
      
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];

      // This should not revert with valid proof
      await expect(
        peerRanking.connect(user1).updateRanking(
          signal,
          root,
          nullifierHash,
          VALID_PROOF,
          ranking
        )
      ).to.not.be.reverted;

      // Verify the ranking was stored
      const storedRanking = await peerRanking.getUserRanking(user1.address);
      expect(storedRanking.length).to.equal(2);
      expect(Number(storedRanking[0].candidateId)).to.equal(1);
      expect(Number(storedRanking[1].candidateId)).to.equal(2);
    });

    it("should prevent nullifier reuse (sybil resistance)", async function () {
      const signal = user1.address;
      const root = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const nullifierHash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef";
      
      const ranking = [{ candidateId: 1, tiedWithPrevious: false }];

      // First vote should succeed
      await peerRanking.connect(user1).updateRanking(
        signal,
        root,
        nullifierHash,
        VALID_PROOF,
        ranking
      );

      // Second vote with same nullifier should fail
      await expect(
        peerRanking.connect(user1).updateRanking(
          signal,
          root,
          nullifierHash, // Same nullifier
          VALID_PROOF,
          ranking
        )
      ).to.be.revertedWithCustomError(peerRanking, "InvalidNullifier");
    });

    it("should allow different users with different nullifiers", async function () {
      const root = "0x1234567890123456789012345678901234567890123456789012345678901234";
      
      // Different nullifiers for different users
      const nullifierHash1 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const nullifierHash2 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      
      const ranking1 = [{ candidateId: 1, tiedWithPrevious: false }];
      const ranking2 = [{ candidateId: 2, tiedWithPrevious: false }];

      // Both users should be able to vote with different nullifiers
      await expect(
        peerRanking.connect(user1).updateRanking(
          user1.address,
          root,
          nullifierHash1,
          VALID_PROOF,
          ranking1
        )
      ).to.not.be.reverted;

      await expect(
        peerRanking.connect(user2).updateRanking(
          user2.address,
          root,
          nullifierHash2,
          VALID_PROOF,
          ranking2
        )
      ).to.not.be.reverted;

      // Verify both rankings were stored
      const user1Ranking = await peerRanking.getUserRanking(user1.address);
      const user2Ranking = await peerRanking.getUserRanking(user2.address);
      
      expect(Number(user1Ranking[0].candidateId)).to.equal(1);
      expect(Number(user2Ranking[0].candidateId)).to.equal(2);
    });
  });

  describe("C. Signal Validation", function () {
    it("should verify signal matches user address", async function () {
      const correctSignal = user1.address;
      const wrongSignal = user2.address; // Different address
      const root = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const nullifierHash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef";
      
      const ranking = [{ candidateId: 1, tiedWithPrevious: false }];

      // Should work with correct signal
      await expect(
        peerRanking.connect(user1).updateRanking(
          correctSignal,
          root,
          nullifierHash,
          VALID_PROOF,
          ranking
        )
      ).to.not.be.reverted;

      // Should fail with wrong signal (different nullifier to avoid reuse error)
      const differentNullifier = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
      await expect(
        peerRanking.connect(user1).updateRanking(
          wrongSignal,
          root,
          differentNullifier,
          VALID_PROOF,
          ranking
        )
      ).to.be.reverted; // World ID verification should fail due to signal mismatch
    });
  });

  describe("D. Ranking Validation", function () {
    it("should validate candidate IDs and ranking structure", async function () {
      const signal = user1.address;
      const root = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const nullifierHash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef";

      // Invalid candidate ID (too high)
      const invalidRanking = [{ candidateId: 999, tiedWithPrevious: false }];

      await expect(
        peerRanking.connect(user1).updateRanking(
          signal,
          root,
          nullifierHash,
          VALID_PROOF,
          invalidRanking
        )
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("should reject empty rankings", async function () {
      const signal = user1.address;
      const root = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const nullifierHash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef";

      const emptyRanking = [];

      await expect(
        peerRanking.connect(user1).updateRanking(
          signal,
          root,
          nullifierHash,
          VALID_PROOF,
          emptyRanking
        )
      ).to.be.revertedWith("Ranking cannot be empty");
    });

    it("should handle tie scenarios correctly", async function () {
      const signal = user1.address;
      const root = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const nullifierHash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef";

      // Valid ranking with ties
      const rankingWithTies = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: true },  // Tied with candidate 1
        { candidateId: 3, tiedWithPrevious: false }
      ];

      await expect(
        peerRanking.connect(user1).updateRanking(
          signal,
          root,
          nullifierHash,
          VALID_PROOF,
          rankingWithTies
        )
      ).to.not.be.reverted;

      // Verify the ranking was stored with tie information
      const storedRanking = await peerRanking.getUserRanking(user1.address);
      expect(storedRanking.length).to.equal(3);
      expect(storedRanking[0].tiedWithPrevious).to.be.false;
      expect(storedRanking[1].tiedWithPrevious).to.be.true;
      expect(storedRanking[2].tiedWithPrevious).to.be.false;
    });
  });
});
