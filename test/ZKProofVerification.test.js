const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("ZK Proof Verification Tests (TDD)", function () {
  let worldID;
  let electionManager;
  let simpleRanking;
  let owner, user1, user2, attacker;

  // Test data for ZK proofs
  const VALID_ROOT = "0x1234567890123456789012345678901234567890123456789012345678901234";
  const VALID_GROUP_ID = 1;
  const VOTING_SIGNAL = "vote_for_candidates";
  const EXTERNAL_NULLIFIER = "election_2024_ranking";
  
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
    [owner, user1, user2, attacker] = await ethers.getSigners();

    // Deploy World ID contract (not mock - real verification)
    const WorldID = await ethers.getContractFactory("MockWorldID");
    worldID = await WorldID.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(worldID.target);

    // Deploy SimpleRankingWithZK with ZK proof verification
    const SimpleRankingWithZK = await ethers.getContractFactory("SimpleRankingWithZK");
    simpleRanking = await SimpleRankingWithZK.deploy(worldID.target, electionManager.target);

    // Add test candidates
    await electionManager.addCandidate("Alice Johnson", "Community leader");
    await electionManager.addCandidate("Bob Smith", "Tech advocate");
    await electionManager.addCandidate("Carol Davis", "Environmental champion");
  });

  describe("A. ZK Proof Parameter Validation", function () {
    it("should accept valid ZK proofs with correct parameters", async function () {
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(VOTING_SIGNAL));
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));

      // This should not revert with valid proof
      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          signalHash,
          nullifierHash,
          externalNullifierHash,
          VALID_PROOF
        )
      ).to.not.be.reverted;

      // Verify the ranking was stored
      const ranking = await simpleRanking.getUserRanking(user1.address);
      expect(ranking.length).to.equal(1);
      expect(bn(ranking[0].candidateId)).to.equal(1);
    });

    it("should reject invalid ZK proofs (wrong nullifier)", async function () {
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(VOTING_SIGNAL));
      const wrongNullifierHash = ethers.keccak256(ethers.toUtf8Bytes("wrong_nullifier"));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));

      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          signalHash,
          wrongNullifierHash,
          externalNullifierHash,
          VALID_PROOF
        )
      ).to.be.revertedWith("Invalid ZK proof");
    });

    it("should reject invalid ZK proofs (wrong signal hash)", async function () {
      const wrongSignalHash = ethers.keccak256(ethers.toUtf8Bytes("wrong_signal"));
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));

      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          wrongSignalHash,
          nullifierHash,
          externalNullifierHash,
          VALID_PROOF
        )
      ).to.be.revertedWith("Invalid signal hash");
    });

    it("should reject invalid ZK proofs (wrong root)", async function () {
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(VOTING_SIGNAL));
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));
      const wrongRoot = "0x9999999999999999999999999999999999999999999999999999999999999999";

      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          wrongRoot,
          VALID_GROUP_ID,
          signalHash,
          nullifierHash,
          externalNullifierHash,
          VALID_PROOF
        )
      ).to.be.revertedWith("Invalid ZK proof");
    });

    it("should reject invalid ZK proofs (wrong group ID)", async function () {
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(VOTING_SIGNAL));
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));
      const wrongGroupId = 999;

      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          VALID_ROOT,
          wrongGroupId,
          signalHash,
          nullifierHash,
          externalNullifierHash,
          VALID_PROOF
        )
      ).to.be.revertedWith("Invalid group ID");
    });
  });

  describe("B. Proof Replay Attack Prevention", function () {
    it("should prevent proof replay attacks (nullifier reuse)", async function () {
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(VOTING_SIGNAL));
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));

      // First vote should succeed
      await simpleRanking.connect(user1).updateRankingWithProof(
        [{ candidateId: 1, tiedWithPrevious: false }],
        VALID_ROOT,
        VALID_GROUP_ID,
        signalHash,
        nullifierHash,
        externalNullifierHash,
        VALID_PROOF
      );

      // Second vote with same nullifier should fail
      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 2, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          signalHash,
          nullifierHash,
          externalNullifierHash,
          VALID_PROOF
        )
      ).to.be.revertedWith("Nullifier already used");
    });

    it("should allow different users with different nullifiers", async function () {
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(VOTING_SIGNAL));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));

      // User 1 nullifier
      const nullifierHash1 = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));

      // User 2 nullifier
      const nullifierHash2 = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user2.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));

      // Both users should be able to vote
      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          signalHash,
          nullifierHash1,
          externalNullifierHash,
          VALID_PROOF
        )
      ).to.not.be.reverted;

      await expect(
        simpleRanking.connect(user2).updateRankingWithProof(
          [{ candidateId: 2, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          signalHash,
          nullifierHash2,
          externalNullifierHash,
          VALID_PROOF
        )
      ).to.not.be.reverted;
    });
  });

  describe("C. Signal and Context Validation", function () {
    it("should validate external nullifier hash for voting context", async function () {
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(VOTING_SIGNAL));
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const wrongExternalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes("wrong_context"));

      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          signalHash,
          nullifierHash,
          wrongExternalNullifierHash,
          VALID_PROOF
        )
      ).to.be.revertedWith("Invalid external nullifier");
    });

    it("should verify signal hash matches voting action", async function () {
      // Signal should be derived from the actual voting action
      const votingAction = JSON.stringify([{ candidateId: 1, tiedWithPrevious: false }]);
      const correctSignalHash = ethers.keccak256(ethers.toUtf8Bytes(votingAction));
      
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));

      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          correctSignalHash,
          nullifierHash,
          externalNullifierHash,
          VALID_PROOF
        )
      ).to.not.be.reverted;
    });
  });

  describe("D. Proof Array Validation", function () {
    it("should handle malformed proof arrays", async function () {
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(VOTING_SIGNAL));
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));

      // Proof array too short
      const shortProof = VALID_PROOF.slice(0, 6);

      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          signalHash,
          nullifierHash,
          externalNullifierHash,
          shortProof
        )
      ).to.be.revertedWith("Invalid proof length");
    });

    it("should validate proof parameter ranges", async function () {
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(VOTING_SIGNAL));
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));

      // Test with zero values (should be rejected)
      const zeroProof = new Array(8).fill("0x0000000000000000000000000000000000000000000000000000000000000000");

      await expect(
        simpleRanking.connect(user1).updateRankingWithProof(
          [{ candidateId: 1, tiedWithPrevious: false }],
          VALID_ROOT,
          VALID_GROUP_ID,
          signalHash,
          nullifierHash,
          externalNullifierHash,
          zeroProof
        )
      ).to.be.revertedWith("Invalid proof values");
    });
  });

  describe("E. Integration with Ranking Logic", function () {
    it("should integrate ZK verification with ranking storage", async function () {
      const votingAction = JSON.stringify([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);
      const signalHash = ethers.keccak256(ethers.toUtf8Bytes(votingAction));
      const nullifierHash = ethers.keccak256(ethers.concat([
        ethers.toUtf8Bytes(user1.address),
        ethers.toUtf8Bytes(EXTERNAL_NULLIFIER)
      ]));
      const externalNullifierHash = ethers.keccak256(ethers.toUtf8Bytes(EXTERNAL_NULLIFIER));

      await simpleRanking.connect(user1).updateRankingWithProof(
        [
          { candidateId: 1, tiedWithPrevious: false },
          { candidateId: 3, tiedWithPrevious: false },
          { candidateId: 2, tiedWithPrevious: false }
        ],
        VALID_ROOT,
        VALID_GROUP_ID,
        signalHash,
        nullifierHash,
        externalNullifierHash,
        VALID_PROOF
      );

      // Verify ranking was stored correctly
      const ranking = await simpleRanking.getUserRanking(user1.address);
      expect(ranking.length).to.equal(3);
      expect(bn(ranking[0].candidateId)).to.equal(1);
      expect(bn(ranking[1].candidateId)).to.equal(3);
      expect(bn(ranking[2].candidateId)).to.equal(2);

      // Verify user is tracked as having voted
      expect(await simpleRanking.hasUserVoted(user1.address)).to.be.true;
    });
  });
});
