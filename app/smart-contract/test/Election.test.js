const { expect } = require("chai");
const { ethers } = require("hardhat");
require("@nomicfoundation/hardhat-chai-matchers");

describe("Election", function () {
  let election;
  let mockWorldID;
  let owner, creator, user1, user2;

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
      const voterId = 12345; // Mock voter ID (nullifier)
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice first
        { candidateId: 3, tiedWithPrevious: false }, // Carol second
        { candidateId: 2, tiedWithPrevious: false }  // Bob third
      ];

      await election.connect(user1).voteTest(voterId, ranking);

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

      await expect(election.connect(user1).voteTest(voterId, ranking))
        .to.emit(election, "RankingUpdated")
        .withArgs(user1.address, [
          [1n, false], // Events emit structs as arrays with BigInt values
          [2n, false]
        ]);
    });

    it("should allow vote updates (same voter ID)", async function () {
      const voterId = 12345;

      // First vote
      await election.connect(user1).voteTest(voterId, [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);

      // Update vote
      await election.connect(user1).voteTest(voterId, [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ]);

      const vote = await election.getVote(voterId);
      expect(Number(vote[0].candidateId)).to.equal(2);
      expect(Number(vote[1].candidateId)).to.equal(1);

      // Should still only count as one voter
      const totalVoters = await election.getTotalVoters();
      expect(Number(totalVoters)).to.equal(1);
    });

    it("should prevent empty votes", async function () {
      const voterId = 12345;

      await expect(
        election.connect(user1).voteTest(voterId, [])
      ).to.be.revertedWithCustomError(election, "RankingEmpty");
    });

    it("should prevent voting for invalid candidates", async function () {
      const voterId = 12345;

      await expect(
        election.connect(user1).voteTest(voterId, [
          { candidateId: 1, tiedWithPrevious: false },
          { candidateId: 5, tiedWithPrevious: false } // Candidate 5 doesn't exist
        ])
      ).to.be.revertedWithCustomError(election, "InvalidCandidateId");
    });

    it("should prevent voting when inactive", async function () {
      const voterId = 12345;

      // Deactivate voting
      await election.connect(creator).toggleVoting();

      await expect(
        election.connect(user1).voteTest(voterId, [
          { candidateId: 1, tiedWithPrevious: false }
        ])
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
      await election.connect(user1).voteTest(voterId, [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ]);

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

      await election.connect(user1).voteTest(voterId1, [
        { candidateId: 1, tiedWithPrevious: false }
      ]);

      await election.connect(user2).voteTest(voterId2, [
        { candidateId: 2, tiedWithPrevious: false }
      ]);

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

      await election.connect(user1).voteTest(voterId1, [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);
      expect(Number(await election.getTotalVoters())).to.equal(1);

      await election.connect(user2).voteTest(voterId2, [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ]);
      expect(Number(await election.getTotalVoters())).to.equal(2);
    });

    it("should return correct election info", async function () {
      const voterId = 12345;
      await election.connect(user1).voteTest(voterId, [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);

      const info = await election.getElectionInfo();
      expect(Number(info._candidateCount)).to.equal(2);
      expect(Number(info._totalVoters)).to.equal(1);
      expect(info._votingActive).to.be.true;
    });

    it("should return voting statistics", async function () {
      const voterId = 12345;
      await election.connect(user1).voteTest(voterId, [
        { candidateId: 1, tiedWithPrevious: false }
      ]);

      const stats = await election.getVotingStats();
      expect(Number(stats.totalVoters)).to.equal(1);
      expect(Number(stats.candidateCount_)).to.equal(2);
    });
  });
});
