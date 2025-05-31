const { expect } = require("chai");
const { ethers } = require("hardhat");
require("@nomicfoundation/hardhat-chai-matchers");

describe("Election", function () {
  let election;
  let mockWorldID;
  let owner, creator, user1, user2;

  // Helper function to generate mock World ID proof parameters
  function getMockWorldIDProof(voterAddress, voterId, ranking) {
    // Signal should represent ONLY the vote data being authorized
    // The voter identity is already handled by the World ID proof/nullifier
    const candidateIds = ranking.map(r => r.candidateId);
    const tiedFlags = ranking.map(r => r.tiedWithPrevious);

    // Create signal that represents this specific vote (not who cast it)
    const signal = ethers.solidityPackedKeccak256(
      ["uint256[]", "bool[]"],
      [candidateIds, tiedFlags]
    );

    return {
      signal: signal, // Signal represents the vote data only
      root: 1, // Mock root
      voterId: voterId, // Mock nullifier hash (represents the human)
      proof: [0, 0, 0, 0, 0, 0, 0, 0] // Mock proof array
    };
  }

  beforeEach(async function () {
    [owner, creator, user1, user2] = await ethers.getSigners();

    // Deploy mock World ID
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    mockWorldID = await MockWorldID.deploy();

    // Deploy Election contract
    const Election = await ethers.getContractFactory("Election");
    election = await Election.deploy(
      mockWorldID.target,
      "Test Election 2024",
      "A test election for governance",
      "vote_test_2024",
      creator.address
    );
  });

  describe("Contract Initialization", function () {
    it("should initialize with correct metadata", async function () {
      const info = await election.getElectionInfo();
      
      expect(info._title).to.equal("Test Election 2024");
      expect(info._description).to.equal("A test election for governance");
      expect(info._worldIdAction).to.equal("vote_test_2024");
      expect(info._creator).to.equal(creator.address);
      expect(info._votingActive).to.be.true;
      expect(Number(info._candidateCount)).to.equal(0);
      expect(Number(info._totalVoters)).to.equal(0);
    });

    it("should set factory as deployer", async function () {
      expect(await election.factory()).to.equal(owner.address);
    });

    it("should set World ID correctly", async function () {
      expect(await election.worldId()).to.equal(mockWorldID.target);
    });
  });

  describe("Candidate Management", function () {
    it("should allow factory to add candidates", async function () {
      await election.addCandidate("Alice Johnson", "Community leader");
      
      const candidateCount = await election.candidateCount();
      expect(Number(candidateCount)).to.equal(1);

      const candidate = await election.candidates(1);
      expect(candidate.name).to.equal("Alice Johnson");
      expect(candidate.description).to.equal("Community leader");
      expect(candidate.active).to.be.true;
    });

    it("should prevent non-factory from adding candidates", async function () {
      await expect(
        election.connect(user1).addCandidate("Bob Smith", "Tech advocate")
      ).to.be.reverted; // AccessControl will revert with custom error
    });

    it("should emit CandidateAdded event", async function () {
      await expect(election.addCandidate("Alice Johnson", "Community leader"))
        .to.emit(election, "CandidateAdded")
        .withArgs(1, "Alice Johnson");
    });

    it("should return active candidates", async function () {
      await election.addCandidate("Alice Johnson", "Community leader");
      await election.addCandidate("Bob Smith", "Tech advocate");

      const candidates = await election.getCandidates();
      expect(Number(candidates.length)).to.equal(2);
      expect(candidates[0].name).to.equal("Alice Johnson");
      expect(candidates[1].name).to.equal("Bob Smith");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      // Add test candidates
      await election.addCandidate("Alice Johnson", "Community leader");
      await election.addCandidate("Bob Smith", "Tech advocate");
      await election.addCandidate("Carol Davis", "Environmental champion");
    });

    it("should allow valid voting", async function () {
      const voterId = 12345;
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice first
        { candidateId: 3, tiedWithPrevious: false }, // Carol second
        { candidateId: 2, tiedWithPrevious: false }  // Bob third
      ];
      const worldIdProof = getMockWorldIDProof(user1.address, voterId, ranking);

      await election.connect(user1).vote(
        worldIdProof.signal,
        worldIdProof.root,
        worldIdProof.voterId,
        worldIdProof.proof,
        ranking
      );

      const vote = await election.getVote(voterId);
      expect(Number(vote[0].candidateId)).to.equal(1);
      expect(Number(vote[1].candidateId)).to.equal(3);
      expect(Number(vote[2].candidateId)).to.equal(2);

      const totalVoters = await election.getTotalVoters();
      expect(Number(totalVoters)).to.equal(1);
    });

    it("should emit RankingUpdated event", async function () {
      const voterId = 12345;
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const worldIdProof = getMockWorldIDProof(user1.address, voterId, ranking);

      await expect(election.connect(user1).vote(
        worldIdProof.signal,
        worldIdProof.root,
        worldIdProof.voterId,
        worldIdProof.proof,
        ranking
      ))
        .to.emit(election, "RankingUpdated")
        .withArgs(user1.address, [
          [1n, false], // Events emit structs as arrays with BigInt values
          [2n, false]
        ]);
    });

    it("should reject vote with mismatched signal", async function () {
      const voterId = 12345;
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const differentRanking = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ];

      // Generate proof for one ranking but try to submit different ranking
      const worldIdProof = getMockWorldIDProof(user1.address, voterId, differentRanking);

      // Configure mock to fail verification for mismatched signal
      await mockWorldID.setVerificationFailure(true, "Invalid signal");

      await expect(
        election.connect(user1).vote(
          worldIdProof.signal,
          worldIdProof.root,
          worldIdProof.voterId,
          worldIdProof.proof,
          ranking // Different ranking than what signal was generated for
        )
      ).to.be.revertedWith("Invalid signal");

      // Reset mock for other tests
      await mockWorldID.reset();
    });

    it("should allow vote updates (same voter ID)", async function () {
      const voterId = 12345;

      // First vote
      const firstRanking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const firstProof = getMockWorldIDProof(user1.address, voterId, firstRanking);

      await election.connect(user1).vote(
        firstProof.signal,
        firstProof.root,
        firstProof.voterId,
        firstProof.proof,
        firstRanking
      );

      // Update vote with different ranking (requires new proof)
      const updatedRanking = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ];
      const updatedProof = getMockWorldIDProof(user1.address, voterId, updatedRanking);

      await election.connect(user1).vote(
        updatedProof.signal,
        updatedProof.root,
        updatedProof.voterId,
        updatedProof.proof,
        updatedRanking
      );

      const vote = await election.getVote(voterId);
      expect(Number(vote[0].candidateId)).to.equal(2);
      expect(Number(vote[1].candidateId)).to.equal(1);

      // Should still only count as one voter
      const totalVoters = await election.getTotalVoters();
      expect(Number(totalVoters)).to.equal(1);
    });

    it("should prevent empty votes", async function () {
      const voterId = 12345;
      const emptyRanking = [];
      const worldIdProof = getMockWorldIDProof(user1.address, voterId, emptyRanking);

      await expect(
        election.connect(user1).vote(
          worldIdProof.signal,
          worldIdProof.root,
          worldIdProof.voterId,
          worldIdProof.proof,
          emptyRanking
        )
      ).to.be.revertedWithCustomError(election, "RankingEmpty");
    });

    it("should prevent voting for invalid candidates", async function () {
      const voterId = 12345;
      const invalidRanking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 5, tiedWithPrevious: false } // Candidate 5 doesn't exist
      ];
      const worldIdProof = getMockWorldIDProof(user1.address, voterId, invalidRanking);

      await expect(
        election.connect(user1).vote(
          worldIdProof.signal,
          worldIdProof.root,
          worldIdProof.voterId,
          worldIdProof.proof,
          invalidRanking
        )
      ).to.be.revertedWithCustomError(election, "InvalidCandidateId");
    });

    it("should prevent voting when inactive", async function () {
      const voterId = 12345;
      const ranking = [{ candidateId: 1, tiedWithPrevious: false }];
      const worldIdProof = getMockWorldIDProof(user1.address, voterId, ranking);

      // Deactivate voting
      await election.connect(creator).toggleVoting();

      await expect(
        election.connect(user1).vote(
          worldIdProof.signal,
          worldIdProof.root,
          worldIdProof.voterId,
          worldIdProof.proof,
          ranking
        )
      ).to.be.revertedWithCustomError(election, "VotingNotActive");
    });
  });

  describe("Voting Status Management", function () {
    it("should allow creator to toggle voting status", async function () {
      expect(await election.votingActive()).to.be.true;

      await election.connect(creator).toggleVoting();
      expect(await election.votingActive()).to.be.false;

      await election.connect(creator).toggleVoting();
      expect(await election.votingActive()).to.be.true;
    });

    it("should prevent non-creator from toggling voting", async function () {
      await expect(
        election.connect(user1).toggleVoting()
      ).to.be.reverted; // AccessControl will revert with custom error
    });

    it("should emit VotingStatusChanged event", async function () {
      await expect(election.connect(creator).toggleVoting())
        .to.emit(election, "VotingStatusChanged")
        .withArgs(false);
    });
  });

  describe("Vote Retrieval", function () {
    beforeEach(async function () {
      await election.addCandidate("Alice Johnson", "Community leader");
      await election.addCandidate("Bob Smith", "Tech advocate");
    });

    it("should return vote for voter who has voted", async function () {
      const voterId = 12345;
      const ranking = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ];
      const worldIdProof = getMockWorldIDProof(user1.address, voterId, ranking);

      await election.connect(user1).vote(
        worldIdProof.signal,
        worldIdProof.root,
        worldIdProof.voterId,
        worldIdProof.proof,
        ranking
      );

      const vote = await election.getVote(voterId);
      expect(Number(vote[0].candidateId)).to.equal(2);
      expect(Number(vote[1].candidateId)).to.equal(1);
    });

    it("should return empty array for voter who hasn't voted", async function () {
      const voterId = 99999;
      const vote = await election.getVote(voterId);
      expect(Number(vote.length)).to.equal(0);
    });

    it("should track all voters", async function () {
      const voterId1 = 12345;
      const voterId2 = 67890;

      const ranking1 = [{ candidateId: 1, tiedWithPrevious: false }];
      const ranking2 = [{ candidateId: 2, tiedWithPrevious: false }];

      const proof1 = getMockWorldIDProof(user1.address, voterId1, ranking1);
      const proof2 = getMockWorldIDProof(user2.address, voterId2, ranking2);

      await election.connect(user1).vote(
        proof1.signal, proof1.root, proof1.voterId, proof1.proof, ranking1
      );

      await election.connect(user2).vote(
        proof2.signal, proof2.root, proof2.voterId, proof2.proof, ranking2
      );

      const allVoters = await election.getAllVoters();
      expect(Number(allVoters.length)).to.equal(2);
      expect(Number(allVoters[0])).to.equal(voterId1);
      expect(Number(allVoters[1])).to.equal(voterId2);
    });
  });

  describe("Election Statistics", function () {
    beforeEach(async function () {
      await election.addCandidate("Alice Johnson", "Community leader");
      await election.addCandidate("Bob Smith", "Tech advocate");
    });

    it("should track total voters correctly", async function () {
      expect(Number(await election.getTotalVoters())).to.equal(0);

      const voterId1 = 12345;
      const voterId2 = 67890;

      const ranking1 = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const ranking2 = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ];

      const proof1 = getMockWorldIDProof(user1.address, voterId1, ranking1);
      const proof2 = getMockWorldIDProof(user2.address, voterId2, ranking2);

      await election.connect(user1).vote(
        proof1.signal, proof1.root, proof1.voterId, proof1.proof, ranking1
      );
      expect(Number(await election.getTotalVoters())).to.equal(1);

      await election.connect(user2).vote(
        proof2.signal, proof2.root, proof2.voterId, proof2.proof, ranking2
      );
      expect(Number(await election.getTotalVoters())).to.equal(2);
    });

    it("should return correct election info", async function () {
      const voterId = 12345;
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const proof = getMockWorldIDProof(user1.address, voterId, ranking);

      await election.connect(user1).vote(
        proof.signal, proof.root, proof.voterId, proof.proof, ranking
      );

      const info = await election.getElectionInfo();
      expect(Number(info._candidateCount)).to.equal(2);
      expect(Number(info._totalVoters)).to.equal(1);
      expect(info._votingActive).to.be.true;
    });

    it("should return voting statistics", async function () {
      const voterId = 12345;
      const ranking = [{ candidateId: 1, tiedWithPrevious: false }];
      const proof = getMockWorldIDProof(user1.address, voterId, ranking);

      await election.connect(user1).vote(
        proof.signal, proof.root, proof.voterId, proof.proof, ranking
      );

      const stats = await election.getVotingStats();
      expect(Number(stats.totalVoters)).to.equal(1);
      expect(Number(stats.candidateCount_)).to.equal(2);
    });
  });
});
