const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mini App Voting Workflow", function () {
  let peerRanking;
  let electionManager;
  let mockWorldID;
  let owner;
  let user1;
  let user2;

  // Mock World ID proof data (for fast testing without real ZK)
  const mockProof = {
    root: "0x1234567890123456789012345678901234567890123456789012345678901234",
    nullifierHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    proof: [1, 2, 3, 4, 5, 6, 7, 8]
  };

  const mockProof2 = {
    root: "0x1234567890123456789012345678901234567890123456789012345678901234",
    nullifierHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
    proof: [1, 2, 3, 4, 5, 6, 7, 8]
  };

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock World ID (simple, fast)
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    mockWorldID = await MockWorldID.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockWorldID.target);

    // Deploy PeerRanking
    const PeerRanking = await ethers.getContractFactory("PeerRanking");
    peerRanking = await PeerRanking.deploy(
      mockWorldID.target,
      "app_test123",
      "vote",
      electionManager.target
    );

    // Add test candidates (clean state)
    await electionManager.addCandidate("Alice Johnson", "Community leader");
    await electionManager.addCandidate("Bob Smith", "Tech advocate");
    await electionManager.addCandidate("Carol Davis", "Environmental champion");
  });

  describe("User Voting Journey", function () {
    it("should allow user to submit their first ranking", async function () {
      // This mirrors what happens when user clicks "Submit Vote" in Mini App
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice - 1st choice
        { candidateId: 2, tiedWithPrevious: false }, // Bob - 2nd choice
        { candidateId: 3, tiedWithPrevious: false }  // Carol - 3rd choice
      ];

      // User submits ranking (like IDKit would provide proof)
      await peerRanking.connect(user1).updateRanking(
        user1.address,
        mockProof.root,
        mockProof.nullifierHash,
        mockProof.proof,
        ranking
      );

      // Verify vote was stored correctly
      const storedRanking = await peerRanking.getNullifierRanking(mockProof.nullifierHash);
      expect(storedRanking).to.have.length(3);
      expect(storedRanking[0].candidateId).to.equal(1);
      expect(storedRanking[1].candidateId).to.equal(2);
      expect(storedRanking[2].candidateId).to.equal(3);

      // Check total rankers increased
      expect(await peerRanking.getTotalRankers()).to.equal(1);
    });

    it("should allow user to update their ranking", async function () {
      // User submits initial ranking
      const initialRanking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];

      await peerRanking.connect(user1).updateRanking(
        user1.address,
        mockProof.root,
        mockProof.nullifierHash,
        mockProof.proof,
        initialRanking
      );

      // User changes their mind and updates ranking
      const updatedRanking = [
        { candidateId: 3, tiedWithPrevious: false }, // Carol now 1st
        { candidateId: 1, tiedWithPrevious: false }, // Alice now 2nd
        { candidateId: 2, tiedWithPrevious: false }  // Bob now 3rd
      ];

      await peerRanking.connect(user1).updateRanking(
        user1.address,
        mockProof.root,
        mockProof.nullifierHash,
        mockProof.proof,
        updatedRanking
      );

      // Verify ranking was updated
      const storedRanking = await peerRanking.getNullifierRanking(mockProof.nullifierHash);
      expect(storedRanking).to.have.length(3);
      expect(storedRanking[0].candidateId).to.equal(3); // Carol first now
      expect(storedRanking[1].candidateId).to.equal(1); // Alice second

      // Total rankers should still be 1 (same user)
      expect(await peerRanking.getTotalRankers()).to.equal(1);
    });

    it("should handle multiple users voting", async function () {
      // User 1 votes
      const ranking1 = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];

      await peerRanking.connect(user1).updateRanking(
        user1.address,
        mockProof.root,
        mockProof.nullifierHash,
        mockProof.proof,
        ranking1
      );

      // User 2 votes (different nullifier)
      const ranking2 = [
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ];

      await peerRanking.connect(user2).updateRanking(
        user2.address,
        mockProof2.root,
        mockProof2.nullifierHash,
        mockProof2.proof,
        ranking2
      );

      // Verify both votes stored
      const stored1 = await peerRanking.getNullifierRanking(mockProof.nullifierHash);
      const stored2 = await peerRanking.getNullifierRanking(mockProof2.nullifierHash);

      expect(stored1[0].candidateId).to.equal(1);
      expect(stored2[0].candidateId).to.equal(3);

      // Total rankers should be 2
      expect(await peerRanking.getTotalRankers()).to.equal(2);
    });

    it("should handle rankings with ties", async function () {
      // User submits ranking with tied candidates
      const rankingWithTies = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice - 1st
        { candidateId: 2, tiedWithPrevious: false }, // Bob - 2nd
        { candidateId: 3, tiedWithPrevious: true }   // Carol - tied for 2nd
      ];

      await peerRanking.connect(user1).updateRanking(
        user1.address,
        mockProof.root,
        mockProof.nullifierHash,
        mockProof.proof,
        rankingWithTies
      );

      // Verify tie information preserved
      const storedRanking = await peerRanking.getNullifierRanking(mockProof.nullifierHash);
      expect(storedRanking[0].tiedWithPrevious).to.be.false;
      expect(storedRanking[1].tiedWithPrevious).to.be.false;
      expect(storedRanking[2].tiedWithPrevious).to.be.true;
    });
  });

  describe("Input Validation", function () {
    it("should reject empty rankings", async function () {
      await expect(
        peerRanking.connect(user1).updateRanking(
          user1.address,
          mockProof.root,
          mockProof.nullifierHash,
          mockProof.proof,
          [] // Empty ranking
        )
      ).to.be.revertedWith("Ranking cannot be empty");
    });

    it("should reject invalid candidate IDs", async function () {
      const invalidRanking = [
        { candidateId: 999, tiedWithPrevious: false } // Invalid ID
      ];

      await expect(
        peerRanking.connect(user1).updateRanking(
          user1.address,
          mockProof.root,
          mockProof.nullifierHash,
          mockProof.proof,
          invalidRanking
        )
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("should reject first entry tied with previous", async function () {
      const invalidTieRanking = [
        { candidateId: 1, tiedWithPrevious: true } // First can't be tied
      ];

      await expect(
        peerRanking.connect(user1).updateRanking(
          user1.address,
          mockProof.root,
          mockProof.nullifierHash,
          mockProof.proof,
          invalidTieRanking
        )
      ).to.be.revertedWith("First entry cannot be tied with previous");
    });
  });

  describe("Contract State Queries", function () {
    it("should return correct ranking stats", async function () {
      // Initially no rankers
      const [totalRankers, totalComparisons, candidateCount] = await peerRanking.getRankingStats();
      expect(totalRankers).to.equal(0);
      expect(totalComparisons).to.equal(0);
      expect(candidateCount).to.equal(3);

      // After one vote
      const ranking = [{ candidateId: 1, tiedWithPrevious: false }];
      await peerRanking.connect(user1).updateRanking(
        user1.address,
        mockProof.root,
        mockProof.nullifierHash,
        mockProof.proof,
        ranking
      );

      const [newTotalRankers] = await peerRanking.getRankingStats();
      expect(newTotalRankers).to.equal(1);
    });

    it("should return all ranker nullifiers", async function () {
      // Add two votes
      await peerRanking.connect(user1).updateRanking(
        user1.address,
        mockProof.root,
        mockProof.nullifierHash,
        mockProof.proof,
        [{ candidateId: 1, tiedWithPrevious: false }]
      );

      await peerRanking.connect(user2).updateRanking(
        user2.address,
        mockProof2.root,
        mockProof2.nullifierHash,
        mockProof2.proof,
        [{ candidateId: 2, tiedWithPrevious: false }]
      );

      const rankers = await peerRanking.getAllRankers();
      expect(rankers).to.have.length(2);
      expect(rankers[0]).to.equal(mockProof.nullifierHash);
      expect(rankers[1]).to.equal(mockProof2.nullifierHash);
    });
  });
});
