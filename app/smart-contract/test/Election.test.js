const { expect } = require("chai");
const { ethers } = require("hardhat");

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
      expect(info._candidateCount).to.equal(0);
      expect(info._totalRankers).to.equal(0);
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
      expect(candidateCount).to.equal(1);

      const candidate = await election.candidates(1);
      expect(candidate.name).to.equal("Alice Johnson");
      expect(candidate.description).to.equal("Community leader");
      expect(candidate.active).to.be.true;
    });

    it("should prevent non-factory from adding candidates", async function () {
      await expect(
        election.connect(user1).addCandidate("Bob Smith", "Tech advocate")
      ).to.be.revertedWith("Only factory can call this function");
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
      expect(candidates.length).to.equal(2);
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
      const rankedVote = [1, 3, 2]; // Alice first, Carol second, Bob third

      await election.connect(user1).vote(rankedVote);

      const hasVoted = await election.hasVoted(user1.address);
      expect(hasVoted).to.be.true;

      const vote = await election.getVote(user1.address);
      expect(vote[0]).to.equal(1);
      expect(vote[1]).to.equal(3);
      expect(vote[2]).to.equal(2);

      const totalVotes = await election.getTotalVotes();
      expect(totalVotes).to.equal(1);
    });

    it("should emit VoteCast event", async function () {
      const rankedVote = [1, 2];

      await expect(election.connect(user1).vote(rankedVote))
        .to.emit(election, "VoteCast")
        .withArgs(user1.address, rankedVote);
    });

    it("should prevent double voting", async function () {
      await election.connect(user1).vote([1, 2]);

      await expect(
        election.connect(user1).vote([2, 1])
      ).to.be.revertedWith("You have already voted");
    });

    it("should prevent empty votes", async function () {
      await expect(
        election.connect(user1).vote([])
      ).to.be.revertedWith("Must vote for at least one candidate");
    });

    it("should prevent voting for invalid candidates", async function () {
      await expect(
        election.connect(user1).vote([1, 5]) // Candidate 5 doesn't exist
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("should prevent voting when inactive", async function () {
      // Deactivate voting
      await election.connect(creator).toggleVoting();

      await expect(
        election.connect(user1).vote([1, 2])
      ).to.be.revertedWith("Voting is not active");
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
      ).to.be.revertedWith("Only creator can call this function");
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
      await election.connect(user1).vote([2, 1]);
      
      const vote = await election.getVote(user1.address);
      expect(vote[0]).to.equal(2);
      expect(vote[1]).to.equal(1);
    });

    it("should revert for voter who hasn't voted", async function () {
      await expect(
        election.getVote(user1.address)
      ).to.be.revertedWith("Voter has not voted");
    });

    it("should check if address has voted", async function () {
      expect(await election.checkHasVoted(user1.address)).to.be.false;
      
      await election.connect(user1).vote([1, 2]);
      
      expect(await election.checkHasVoted(user1.address)).to.be.true;
    });
  });

  describe("Election Statistics", function () {
    beforeEach(async function () {
      await election.addCandidate("Alice Johnson", "Community leader");
      await election.addCandidate("Bob Smith", "Tech advocate");
    });

    it("should track total votes correctly", async function () {
      expect(await election.getTotalVotes()).to.equal(0);

      await election.connect(user1).vote([1, 2]);
      expect(await election.getTotalVotes()).to.equal(1);

      await election.connect(user2).vote([2, 1]);
      expect(await election.getTotalVotes()).to.equal(2);
    });

    it("should return correct election info", async function () {
      await election.connect(user1).vote([1, 2]);
      
      const info = await election.getElectionInfo();
      expect(info._candidateCount).to.equal(2);
      expect(info._totalVotes).to.equal(1);
      expect(info._votingActive).to.be.true;
    });
  });
});
