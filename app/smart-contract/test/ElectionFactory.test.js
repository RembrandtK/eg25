const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ElectionFactory", function () {
  let electionFactory;
  let mockWorldID;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock World ID
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    mockWorldID = await MockWorldID.deploy();

    // Deploy ElectionFactory
    const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
    electionFactory = await ElectionFactory.deploy(mockWorldID.target);
  });

  describe("Election Creation", function () {
    it("should create a new election with unique action", async function () {
      const electionTitle = "Test Election 2024";
      const electionDescription = "A test election for governance";
      const worldIdAction = "vote_test_2024";
      const candidates = [
        { name: "Alice", description: "Candidate A" },
        { name: "Bob", description: "Candidate B" }
      ];

      const tx = await electionFactory.createElection(
        electionTitle,
        electionDescription,
        worldIdAction,
        candidates
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log =>
        log.fragment && log.fragment.name === "ElectionCreated"
      );

      expect(event).to.not.be.undefined;
      expect(event.args.electionId).to.equal(1);
      expect(event.args.title).to.equal(electionTitle);
      expect(event.args.creator).to.equal(owner.address);

      // Verify election was stored
      const election = await electionFactory.getElection(1);
      expect(election.title).to.equal(electionTitle);
      expect(election.description).to.equal(electionDescription);
      expect(election.worldIdAction).to.equal(worldIdAction);
      expect(election.creator).to.equal(owner.address);
      expect(election.active).to.be.true;
    });

    it("should deploy separate Election contract for each election", async function () {
      // Create first election
      await electionFactory.createElection(
        "Election 1",
        "First election",
        "vote_election_1",
        [{ name: "Alice", description: "Candidate A" }]
      );

      // Create second election
      await electionFactory.createElection(
        "Election 2",
        "Second election",
        "vote_election_2",
        [{ name: "Bob", description: "Candidate B" }]
      );

      const election1 = await electionFactory.getElection(1);
      const election2 = await electionFactory.getElection(2);

      // Should have different contract addresses
      expect(election1.electionAddress).to.not.equal(election2.electionAddress);
      expect(election1.electionAddress).to.not.equal(ethers.ZeroAddress);
      expect(election2.electionAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should prevent duplicate World ID actions", async function () {
      const duplicateAction = "vote_duplicate";

      // Create first election
      await electionFactory.createElection(
        "Election 1",
        "First election",
        duplicateAction,
        [{ name: "Alice", description: "Candidate A" }]
      );

      // Try to create second election with same action
      await expect(
        electionFactory.createElection(
          "Election 2",
          "Second election", 
          duplicateAction,
          [{ name: "Bob", description: "Candidate B" }]
        )
      ).to.be.revertedWith("World ID action already used");
    });

    it("should require at least one candidate", async function () {
      await expect(
        electionFactory.createElection(
          "Empty Election",
          "Election with no candidates",
          "vote_empty",
          []
        )
      ).to.be.revertedWith("Must have at least one candidate");
    });

    it("should only allow owner to create elections initially", async function () {
      await expect(
        electionFactory.connect(user1).createElection(
          "Unauthorized Election",
          "Should fail",
          "vote_unauthorized",
          [{ name: "Alice", description: "Candidate A" }]
        )
      ).to.be.revertedWith("Only owner can create elections");
    });
  });

  describe("Election Management", function () {
    beforeEach(async function () {
      // Create a test election
      await electionFactory.createElection(
        "Test Election",
        "A test election",
        "vote_test",
        [
          { name: "Alice", description: "Candidate A" },
          { name: "Bob", description: "Candidate B" }
        ]
      );
    });

    it("should list all elections", async function () {
      const elections = await electionFactory.getAllElections();
      expect(elections.length).to.equal(1);
      expect(elections[0].title).to.equal("Test Election");
    });

    it("should get election count", async function () {
      const count = await electionFactory.getElectionCount();
      expect(count).to.equal(1);
    });

    it("should allow deactivating elections", async function () {
      await electionFactory.deactivateElection(1);
      
      const election = await electionFactory.getElection(1);
      expect(election.active).to.be.false;
    });

    it("should emit ElectionDeactivated event", async function () {
      await expect(electionFactory.deactivateElection(1))
        .to.emit(electionFactory, "ElectionDeactivated")
        .withArgs(1);
    });

    it("should prevent deactivating non-existent elections", async function () {
      await expect(
        electionFactory.deactivateElection(999)
      ).to.be.revertedWith("Election does not exist");
    });
  });

  describe("Integration with Election Contract", function () {
    let electionAddress;

    beforeEach(async function () {
      // Create election and get the election address
      const tx = await electionFactory.createElection(
        "Integration Test",
        "Testing integration",
        "vote_integration",
        [
          { name: "Alice", description: "Candidate A" },
          { name: "Bob", description: "Candidate B" }
        ]
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log =>
        log.fragment && log.fragment.name === "ElectionCreated"
      );
      electionAddress = event.args.electionAddress;
    });

    it("should deploy functional Election contract", async function () {
      const Election = await ethers.getContractFactory("Election");
      const election = Election.attach(electionAddress);

      // Check that candidates were added
      const candidateCount = await election.candidateCount();
      expect(candidateCount).to.equal(2);

      // Check first candidate
      const candidate1 = await election.candidates(1);
      expect(candidate1.name).to.equal("Alice");
      expect(candidate1.description).to.equal("Candidate A");
      expect(candidate1.active).to.be.true;
    });

    it("should allow voting through deployed Election contract", async function () {
      const Election = await ethers.getContractFactory("Election");
      const election = Election.attach(electionAddress);

      // Cast a vote
      await election.connect(user1).vote([1, 2]);

      // Verify vote was recorded
      const hasVoted = await election.hasVoted(user1.address);
      expect(hasVoted).to.be.true;

      const vote = await election.getVote(user1.address);
      expect(vote[0]).to.equal(1);
      expect(vote[1]).to.equal(2);
    });
  });
});
