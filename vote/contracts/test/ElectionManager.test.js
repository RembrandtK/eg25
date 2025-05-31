const { expect } = require("chai");
const { ethers } = require("hardhat");
require("@nomicfoundation/hardhat-chai-matchers");

describe("ElectionManager", function () {
  let electionManager;
  let mockWorldID;
  let admin, creator1, creator2, user1;

  beforeEach(async function () {
    [admin, creator1, creator2, user1] = await ethers.getSigners();

    // Deploy mock World ID
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    mockWorldID = await MockWorldID.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockWorldID.target);
  });

  describe("Role Management", function () {
    it("should set deployer as admin and creator", async function () {
      const ADMIN_ROLE = await electionManager.ADMIN_ROLE();
      const ELECTION_CREATOR_ROLE = await electionManager.ELECTION_CREATOR_ROLE();
      
      expect(await electionManager.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await electionManager.hasRole(ELECTION_CREATOR_ROLE, admin.address)).to.be.true;
    });

    it("should allow admin to grant creator role", async function () {
      await electionManager.connect(admin).grantCreatorRole(creator1.address);
      
      expect(await electionManager.canCreateElections(creator1.address)).to.be.true;
    });

    it("should allow admin to revoke creator role", async function () {
      await electionManager.connect(admin).grantCreatorRole(creator1.address);
      await electionManager.connect(admin).revokeCreatorRole(creator1.address);
      
      expect(await electionManager.canCreateElections(creator1.address)).to.be.false;
    });

    it("should prevent non-admin from granting creator role", async function () {
      await expect(
        electionManager.connect(user1).grantCreatorRole(creator1.address)
      ).to.be.reverted;
    });

    it("should emit CreatorRoleGranted event", async function () {
      await expect(electionManager.connect(admin).grantCreatorRole(creator1.address))
        .to.emit(electionManager, "CreatorRoleGranted")
        .withArgs(creator1.address, admin.address);
    });
  });

  describe("Election Creation", function () {
    beforeEach(async function () {
      // Grant creator role to creator1
      await electionManager.connect(admin).grantCreatorRole(creator1.address);
    });

    it("should create a new election with unique action", async function () {
      const electionTitle = "Test Election 2024";
      const electionDescription = "A test election for governance";
      const worldIdAction = "vote_test_2024";
      const candidates = [
        { name: "Alice", description: "Candidate A" },
        { name: "Bob", description: "Candidate B" }
      ];

      const tx = await electionManager.connect(creator1).createElection(
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
      expect(event.args.creator).to.equal(creator1.address);

      // Verify election was stored
      const election = await electionManager.getElection(1);
      expect(election.title).to.equal(electionTitle);
      expect(election.description).to.equal(electionDescription);
      expect(election.worldIdAction).to.equal(worldIdAction);
      expect(election.creator).to.equal(creator1.address);
      expect(election.active).to.be.true;
    });

    it("should deploy separate Election contract for each election", async function () {
      // Create first election
      await electionManager.connect(creator1).createElection(
        "Election 1",
        "First election",
        "vote_election_1",
        [{ name: "Alice", description: "Candidate A" }]
      );

      // Create second election
      await electionManager.connect(creator1).createElection(
        "Election 2", 
        "Second election",
        "vote_election_2",
        [{ name: "Bob", description: "Candidate B" }]
      );

      const election1 = await electionManager.getElection(1);
      const election2 = await electionManager.getElection(2);

      // Should have different contract addresses
      expect(election1.electionAddress).to.not.equal(election2.electionAddress);
      expect(election1.electionAddress).to.not.equal(ethers.ZeroAddress);
      expect(election2.electionAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should prevent duplicate World ID actions", async function () {
      const duplicateAction = "vote_duplicate";

      // Create first election
      await electionManager.connect(creator1).createElection(
        "Election 1",
        "First election",
        duplicateAction,
        [{ name: "Alice", description: "Candidate A" }]
      );

      // Try to create second election with same action
      await expect(
        electionManager.connect(creator1).createElection(
          "Election 2",
          "Second election", 
          duplicateAction,
          [{ name: "Bob", description: "Candidate B" }]
        )
      ).to.be.revertedWithCustomError(electionManager, "WorldIdActionAlreadyUsed");
    });

    it("should require at least one candidate", async function () {
      await expect(
        electionManager.connect(creator1).createElection(
          "Empty Election",
          "Election with no candidates",
          "vote_empty",
          []
        )
      ).to.be.revertedWithCustomError(electionManager, "NoCandidatesProvided");
    });

    it("should prevent non-creators from creating elections", async function () {
      await expect(
        electionManager.connect(user1).createElection(
          "Unauthorized Election",
          "Should fail",
          "vote_unauthorized",
          [{ name: "Alice", description: "Candidate A" }]
        )
      ).to.be.reverted;
    });

    it("should track elections by creator", async function () {
      // Grant creator role to creator2
      await electionManager.connect(admin).grantCreatorRole(creator2.address);

      // Create elections by different creators
      await electionManager.connect(creator1).createElection(
        "Creator1 Election",
        "Election by creator1",
        "vote_creator1",
        [{ name: "Alice", description: "Candidate A" }]
      );

      await electionManager.connect(creator2).createElection(
        "Creator2 Election",
        "Election by creator2",
        "vote_creator2",
        [{ name: "Bob", description: "Candidate B" }]
      );

      const creator1Elections = await electionManager.getElectionsByCreator(creator1.address);
      const creator2Elections = await electionManager.getElectionsByCreator(creator2.address);

      expect(creator1Elections.length).to.equal(1);
      expect(creator2Elections.length).to.equal(1);
      expect(creator1Elections[0].title).to.equal("Creator1 Election");
      expect(creator2Elections[0].title).to.equal("Creator2 Election");
    });
  });

  describe("Election Management", function () {
    beforeEach(async function () {
      await electionManager.connect(admin).grantCreatorRole(creator1.address);
      
      // Create a test election
      await electionManager.connect(creator1).createElection(
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
      const elections = await electionManager.getAllElections();
      expect(elections.length).to.equal(1);
      expect(elections[0].title).to.equal("Test Election");
    });

    it("should get election count", async function () {
      const count = await electionManager.getElectionCount();
      expect(count).to.equal(1);
    });

    it("should allow creator to deactivate their election", async function () {
      await electionManager.connect(creator1).deactivateElection(1);
      
      const election = await electionManager.getElection(1);
      expect(election.active).to.be.false;
    });

    it("should allow admin to deactivate any election", async function () {
      await electionManager.connect(admin).deactivateElection(1);
      
      const election = await electionManager.getElection(1);
      expect(election.active).to.be.false;
    });

    it("should prevent unauthorized deactivation", async function () {
      await expect(
        electionManager.connect(user1).deactivateElection(1)
      ).to.be.revertedWithCustomError(electionManager, "UnauthorizedDeactivation");
    });

    it("should emit ElectionDeactivated event", async function () {
      await expect(electionManager.connect(creator1).deactivateElection(1))
        .to.emit(electionManager, "ElectionDeactivated")
        .withArgs(1);
    });

    it("should get active elections only", async function () {
      // Create another election
      await electionManager.connect(creator1).createElection(
        "Second Election",
        "Another election",
        "vote_second",
        [{ name: "Carol", description: "Candidate C" }]
      );

      // Deactivate first election
      await electionManager.connect(creator1).deactivateElection(1);

      const activeElections = await electionManager.getActiveElections();
      expect(activeElections.length).to.equal(1);
      expect(activeElections[0].title).to.equal("Second Election");
    });

    it("should find election by World ID action", async function () {
      const election = await electionManager.getElectionByAction("vote_test");
      expect(election.title).to.equal("Test Election");
    });

    it("should revert when election not found by action", async function () {
      await expect(
        electionManager.getElectionByAction("nonexistent_action")
      ).to.be.revertedWithCustomError(electionManager, "ActionNotFound");
    });
  });
});
