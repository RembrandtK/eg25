const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// This should be automatically loaded by hardhat-toolbox, but let's be explicit
require("@nomicfoundation/hardhat-chai-matchers");

describe("Mini App Voting Workflow (using Election contract)", function () {
  let election;
  let electionManager;
  let mockWorldID;
  let owner;
  let user1;
  let user2;

  // Mock World ID proof data (for fast testing without real ZK)
  const mockProof = {
    root: 1,
    nullifierHash: 12345,
    proof: [0, 0, 0, 0, 0, 0, 0, 0]
  };

  const mockProof2 = {
    root: 1,
    nullifierHash: 67890,
    proof: [0, 0, 0, 0, 0, 0, 0, 0]
  };

  // Helper function to generate mock World ID proof
  function getMockWorldIDProof(voterAddress, voterId, ranking) {
    const candidateIds = ranking.map(r => r.candidateId);
    const tiedFlags = ranking.map(r => r.tiedWithPrevious);
    const signal = ethers.solidityPackedKeccak256(
      ["uint256[]", "bool[]"],
      [candidateIds, tiedFlags]
    );
    return {
      signal: signal,
      root: 1,
      voterId: voterId,
      proof: [0, 0, 0, 0, 0, 0, 0, 0]
    };
  }

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock World ID (simple, fast)
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    mockWorldID = await MockWorldID.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockWorldID.target);

    // Grant creator role to owner
    await electionManager.grantCreatorRole(owner.address);

    // Create an election with test candidates
    await electionManager.createElection(
      "Mini App Test Election",
      "Testing mini app workflow",
      "vote_miniapp_test",
      [
        { name: "Alice Johnson", description: "Community leader" },
        { name: "Bob Smith", description: "Tech advocate" },
        { name: "Carol Davis", description: "Environmental champion" }
      ]
    );

    // Get the deployed election contract
    const electionData = await electionManager.getElection(1);
    const Election = await ethers.getContractFactory("Election");
    election = Election.attach(electionData.electionAddress);
  });

  describe("User Voting Journey", function () {
    it("should allow user to submit their first ranking", async function () {
      // This mirrors what happens when user clicks "Submit Vote" in Mini App
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice - 1st choice
        { candidateId: 2, tiedWithPrevious: false }, // Bob - 2nd choice
        { candidateId: 3, tiedWithPrevious: false }  // Carol - 3rd choice
      ];

      // Generate World ID proof
      const worldIdProof = getMockWorldIDProof(user1.address, mockProof.nullifierHash, ranking);

      // User submits ranking (like IDKit would provide proof)
      await election.connect(user1).vote(
        worldIdProof.signal,
        worldIdProof.root,
        worldIdProof.voterId,
        worldIdProof.proof,
        ranking
      );

      // Verify vote was stored correctly
      const storedRanking = await election.getVote(mockProof.nullifierHash);
      expect(storedRanking).to.have.length(3);
      expect(Number(storedRanking[0].candidateId)).to.equal(1);
      expect(Number(storedRanking[1].candidateId)).to.equal(2);
      expect(Number(storedRanking[2].candidateId)).to.equal(3);

      // Check total vote count increased
      expect(Number(await election.getVoteCount())).to.equal(1);
    });

    it("should allow user to update their ranking", async function () {
      // User submits initial ranking
      const initialRanking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];

      const initialProof = getMockWorldIDProof(user1.address, mockProof.nullifierHash, initialRanking);
      await election.connect(user1).vote(
        initialProof.signal,
        initialProof.root,
        initialProof.voterId,
        initialProof.proof,
        initialRanking
      );

      // User changes their mind and updates ranking
      const updatedRanking = [
        { candidateId: 3, tiedWithPrevious: false }, // Carol now 1st
        { candidateId: 1, tiedWithPrevious: false }, // Alice now 2nd
        { candidateId: 2, tiedWithPrevious: false }  // Bob now 3rd
      ];

      const updatedProof = getMockWorldIDProof(user1.address, mockProof.nullifierHash, updatedRanking);
      await election.connect(user1).vote(
        updatedProof.signal,
        updatedProof.root,
        updatedProof.voterId,
        updatedProof.proof,
        updatedRanking
      );

      // Verify ranking was updated
      const storedRanking = await election.getVote(mockProof.nullifierHash);
      expect(storedRanking).to.have.length(3);
      expect(Number(storedRanking[0].candidateId)).to.equal(3); // Carol first now
      expect(Number(storedRanking[1].candidateId)).to.equal(1); // Alice second

      // Total vote count should still be 1 (same user)
      expect(Number(await election.getVoteCount())).to.equal(1);
    });

    it("should handle multiple users voting", async function () {
      // User 1 votes
      const ranking1 = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];

      const proof1 = getMockWorldIDProof(user1.address, mockProof.nullifierHash, ranking1);
      await election.connect(user1).vote(
        proof1.signal,
        proof1.root,
        proof1.voterId,
        proof1.proof,
        ranking1
      );

      // User 2 votes (different nullifier)
      const ranking2 = [
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ];

      const proof2 = getMockWorldIDProof(user2.address, mockProof2.nullifierHash, ranking2);
      await election.connect(user2).vote(
        proof2.signal,
        proof2.root,
        proof2.voterId,
        proof2.proof,
        ranking2
      );

      // Verify both votes stored
      const stored1 = await election.getVote(mockProof.nullifierHash);
      const stored2 = await election.getVote(mockProof2.nullifierHash);

      expect(Number(stored1[0].candidateId)).to.equal(1);
      expect(Number(stored2[0].candidateId)).to.equal(3);

      // Total vote count should be 2
      expect(Number(await election.getVoteCount())).to.equal(2);
    });

    it("should handle rankings with ties", async function () {
      // User submits ranking with tied candidates
      const rankingWithTies = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice - 1st
        { candidateId: 2, tiedWithPrevious: false }, // Bob - 2nd
        { candidateId: 3, tiedWithPrevious: true }   // Carol - tied for 2nd
      ];

      const proof = getMockWorldIDProof(user1.address, mockProof.nullifierHash, rankingWithTies);
      await election.connect(user1).vote(
        proof.signal,
        proof.root,
        proof.voterId,
        proof.proof,
        rankingWithTies
      );

      // Verify tie information preserved
      const storedRanking = await election.getVote(mockProof.nullifierHash);
      expect(storedRanking[0].tiedWithPrevious).to.be.false;
      expect(storedRanking[1].tiedWithPrevious).to.be.false;
      expect(storedRanking[2].tiedWithPrevious).to.be.true;
    });

    it("should reject invalid candidate IDs", async function () {
      const invalidRanking = [
        { candidateId: 999, tiedWithPrevious: false } // Invalid ID
      ];

      const proof = getMockWorldIDProof(user1.address, mockProof.nullifierHash, invalidRanking);
      await expect(
        election.connect(user1).vote(
          proof.signal,
          proof.root,
          proof.voterId,
          proof.proof,
          invalidRanking
        )
      ).to.be.revertedWithCustomError(election, "InvalidCandidateId");
    });

    it("should reject first entry tied with previous", async function () {
      const invalidTieRanking = [
        { candidateId: 1, tiedWithPrevious: true } // First can't be tied
      ];

      const proof = getMockWorldIDProof(user1.address, mockProof.nullifierHash, invalidTieRanking);
      await expect(
        election.connect(user1).vote(
          proof.signal,
          proof.root,
          proof.voterId,
          proof.proof,
          invalidTieRanking
        )
      ).to.be.revertedWithCustomError(election, "FirstEntryCannotBeTied");
    });
  });
});
