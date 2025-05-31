const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("ElectionManager", function () {
  let electionManager;
  let mockAddressBook;
  let owner;
  let voter1;
  let voter2;
  let unverifiedUser;

  beforeEach(async function () {
    [owner, voter1, voter2, unverifiedUser] = await ethers.getSigners();

    // Deploy mock address book
    const MockAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    mockAddressBook = await MockAddressBook.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockAddressBook.target);

    // Verify test addresses (voter1 and voter2)
    const verificationDuration = 365 * 24 * 60 * 60; // 1 year
    const currentTime = Math.floor(Date.now() / 1000);
    const verifiedUntil = currentTime + verificationDuration;

    await mockAddressBook.setAddressVerifiedUntil(voter1.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter2.address, verifiedUntil);
    // unverifiedUser is intentionally not verified
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await electionManager.owner()).to.equal(owner.address);
    });

    it("Should set voting as active by default", async function () {
      expect(await electionManager.votingActive()).to.be.true;
    });

    it("Should start with zero candidates", async function () {
      expect(bn(await electionManager.candidateCount())).to.equal(0);
    });

    it("Should set the correct address book", async function () {
      expect(await electionManager.worldAddressBook()).to.equal(mockAddressBook.target);
    });
  });

  describe("Candidate Management", function () {
    it("Should allow owner to add candidates", async function () {
      await electionManager.addCandidate("Alice Johnson", "Experienced leader");

      expect(bn(await electionManager.candidateCount())).to.equal(1);

      const candidate = await electionManager.candidates(1);
      expect(bn(candidate.id)).to.equal(1);
      expect(candidate.name).to.equal("Alice Johnson");
      expect(candidate.description).to.equal("Experienced leader");
      expect(candidate.active).to.be.true;
    });

    it("Should emit CandidateAdded event", async function () {
      await expect(electionManager.addCandidate("Bob Smith", "Innovation advocate"))
        .to.emit(electionManager, "CandidateAdded")
        .withArgs(1, "Bob Smith");
    });

    it("Should not allow non-owner to add candidates", async function () {
      await expect(
        electionManager.connect(voter1).addCandidate("Unauthorized", "Should fail")
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should return all active candidates", async function () {
      await electionManager.addCandidate("Alice Johnson", "Leader");
      await electionManager.addCandidate("Bob Smith", "Innovator");
      await electionManager.addCandidate("Carol Davis", "Environmentalist");

      const candidates = await electionManager.getCandidates();
      expect(candidates.length).to.equal(3);
      expect(candidates[0].name).to.equal("Alice Johnson");
      expect(candidates[1].name).to.equal("Bob Smith");
      expect(candidates[2].name).to.equal("Carol Davis");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      // Add test candidates
      await electionManager.addCandidate("Alice Johnson", "Leader");
      await electionManager.addCandidate("Bob Smith", "Innovator");
      await electionManager.addCandidate("Carol Davis", "Environmentalist");
      await electionManager.addCandidate("David Wilson", "Economist");
    });

    it("Should allow verified user to vote", async function () {
      const rankedIds = [2, 1, 3]; // Bob, Alice, Carol

      await expect(electionManager.connect(voter1).vote(rankedIds))
        .to.emit(electionManager, "VoteCast")
        .withArgs(voter1.address, rankedIds);

      expect(await electionManager.hasVoted(voter1.address)).to.be.true;
      expect(bn(await electionManager.getTotalVotes())).to.equal(1);
    });

    it("Should not allow unverified user to vote", async function () {
      const rankedIds = [1, 2, 3];

      await expect(
        electionManager.connect(unverifiedUser).vote(rankedIds)
      ).to.be.revertedWith("Address not verified");
    });

    it("Should not allow voting twice", async function () {
      const rankedIds = [1, 2, 3];

      await electionManager.connect(voter1).vote(rankedIds);

      await expect(
        electionManager.connect(voter1).vote([3, 2, 1])
      ).to.be.revertedWith("You have already voted");
    });

    it("Should not allow empty vote", async function () {
      await expect(
        electionManager.connect(voter1).vote([])
      ).to.be.revertedWith("Must vote for at least one candidate");
    });

    it("Should not allow voting for invalid candidate IDs", async function () {
      await expect(
        electionManager.connect(voter1).vote([1, 2, 5]) // 5 doesn't exist
      ).to.be.revertedWith("Invalid candidate ID");

      await expect(
        electionManager.connect(voter1).vote([0, 1, 2]) // 0 is invalid
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("Should store and retrieve votes correctly", async function () {
      const rankedIds = [3, 1, 4, 2]; // Carol, Alice, David, Bob

      await electionManager.connect(voter1).vote(rankedIds);

      const retrievedVote = await electionManager.getVote(voter1.address);
      expect(retrievedVote.map(id => Number(id))).to.deep.equal(rankedIds);
    });

    it("Should not allow retrieving vote for non-voter", async function () {
      await expect(
        electionManager.getVote(voter2.address)
      ).to.be.revertedWith("Voter has not voted");
    });

    it("Should track multiple voters correctly", async function () {
      await electionManager.connect(voter1).vote([1, 2, 3]);
      await electionManager.connect(voter2).vote([3, 2, 1]);

      expect(bn(await electionManager.getTotalVotes())).to.equal(2);
      expect(await electionManager.hasVoted(voter1.address)).to.be.true;
      expect(await electionManager.hasVoted(voter2.address)).to.be.true;
    });
  });

  describe("Voting Control", function () {
    beforeEach(async function () {
      await electionManager.addCandidate("Alice Johnson", "Leader");
      await electionManager.addCandidate("Bob Smith", "Innovator");
    });

    it("Should allow owner to toggle voting", async function () {
      expect(await electionManager.votingActive()).to.be.true;

      await expect(electionManager.toggleVoting())
        .to.emit(electionManager, "VotingStatusChanged")
        .withArgs(false);

      expect(await electionManager.votingActive()).to.be.false;

      await electionManager.toggleVoting();
      expect(await electionManager.votingActive()).to.be.true;
    });

    it("Should not allow non-owner to toggle voting", async function () {
      await expect(
        electionManager.connect(voter1).toggleVoting()
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should not allow voting when inactive", async function () {
      await electionManager.toggleVoting(); // Disable voting

      await expect(
        electionManager.connect(voter1).vote([1, 2])
      ).to.be.revertedWith("Voting is not active");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await electionManager.addCandidate("Alice Johnson", "Leader");
      await electionManager.addCandidate("Bob Smith", "Innovator");
      await electionManager.connect(voter1).vote([2, 1]);
    });

    it("Should check voting status correctly", async function () {
      expect(await electionManager.checkHasVoted(voter1.address)).to.be.true;
      expect(await electionManager.checkHasVoted(voter2.address)).to.be.false;
    });

    it("Should return correct total votes", async function () {
      expect(bn(await electionManager.getTotalVotes())).to.equal(1);

      await electionManager.connect(voter2).vote([1, 2]);
      expect(bn(await electionManager.getTotalVotes())).to.equal(2);
    });

    it("Should return candidate count", async function () {
      expect(bn(await electionManager.candidateCount())).to.equal(2);

      await electionManager.addCandidate("Carol Davis", "Environmentalist");
      expect(bn(await electionManager.candidateCount())).to.equal(3);
    });
  });
});
