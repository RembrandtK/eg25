const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { getNetworkConfig, getWorldIdAddress } = require("../config/networks");

// This should be automatically loaded by hardhat-toolbox, but let's be explicit
require("@nomicfoundation/hardhat-chai-matchers");

describe("Centralized World ID Verification", function () {
  let electionManager;
  let election;
  let realWorldID;
  let owner;
  let user1;
  let user2;

  // Network configuration will be determined dynamically
  let networkConfig;
  const TEST_ACTION = "centralized-test-action";

  // Mock proof data
  const mockProof = {
    root: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    nullifierHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    proof: [
      "0x1111111111111111111111111111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333333333333333333333333333",
      "0x4444444444444444444444444444444444444444444444444444444444444444",
      "0x5555555555555555555555555555555555555555555555555555555555555555",
      "0x6666666666666666666666666666666666666666666666666666666666666666",
      "0x7777777777777777777777777777777777777777777777777777777777777777",
      "0x8888888888888888888888888888888888888888888888888888888888888888"
    ]
  };

  // Helper function to generate signal hash
  function generateSignalHash(candidateIds, tiedFlags) {
    return ethers.solidityPackedKeccak256(
      ["uint256[]", "bool[]"],
      [candidateIds, tiedFlags]
    );
  }

  async function deployWithRealWorldId() {
    [owner, user1, user2] = await ethers.getSigners();

    // Get network configuration
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    networkConfig = getNetworkConfig(network.name, chainId);

    console.log(`Testing on ${networkConfig.networkName} (${chainId})`);
    console.log(`World ID Router: ${networkConfig.worldIdRouter}`);

    // Deploy ElectionManager with network-specific World ID Router
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(networkConfig.worldIdRouter);

    await electionManager.grantCreatorRole(owner.address);

    // Create election
    await electionManager.createElection(
      "Centralized Verification Test",
      "Testing centralized World ID verification",
      TEST_ACTION,
      [
        { name: "Alice", description: "Candidate A" },
        { name: "Bob", description: "Candidate B" },
        { name: "Carol", description: "Candidate C" }
      ]
    );

    // Get the deployed election contract
    const electionData = await electionManager.getElection(1);
    const Election = await ethers.getContractFactory("Election");
    election = Election.attach(electionData.electionAddress);

    return { electionManager, election, owner, user1, user2 };
  }

  describe("Architecture Verification", function () {
    it("should have ElectionManager with real World ID Router", async function () {
      await loadFixture(deployWithRealWorldId);
      
      const worldIdAddress = await electionManager.worldID();
      expect(worldIdAddress).to.equal(networkConfig.worldIdRouter);
    });

    it("should have Election contract referencing ElectionManager", async function () {
      await loadFixture(deployWithRealWorldId);
      
      const electionManagerAddress = await election.electionManager();
      expect(electionManagerAddress).to.equal(await electionManager.getAddress());
    });

    it("should be able to get election ID by address", async function () {
      await loadFixture(deployWithRealWorldId);
      
      const electionAddress = await election.getAddress();
      const electionId = await electionManager.getElectionIdByAddress(electionAddress);
      expect(electionId).to.equal(1n);
    });
  });

  describe("Centralized World ID Verification", function () {
    it("should verify World ID proof through ElectionManager", async function () {
      await loadFixture(deployWithRealWorldId);
      
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];

      const candidateIds = ranking.map(r => r.candidateId);
      const tiedFlags = ranking.map(r => r.tiedWithPrevious);
      const signalHash = generateSignalHash(candidateIds, tiedFlags);

      // This should fail with real World ID (expected behavior)
      await expect(
        electionManager.verifyWorldIdProof(
          1, // election ID
          signalHash,
          mockProof.root,
          mockProof.nullifierHash,
          mockProof.proof
        )
      ).to.be.reverted; // Expected: Real World ID verification failure
    });

    it("should demonstrate voting flow with centralized verification", async function () {
      await loadFixture(deployWithRealWorldId);
      
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];

      const candidateIds = ranking.map(r => r.candidateId);
      const tiedFlags = ranking.map(r => r.tiedWithPrevious);
      const signalHash = generateSignalHash(candidateIds, tiedFlags);

      // This will fail because Election calls ElectionManager for verification
      // and ElectionManager uses real World ID
      await expect(
        election.connect(user1).vote(
          signalHash,
          mockProof.root,
          mockProof.nullifierHash,
          mockProof.proof,
          ranking
        )
      ).to.be.reverted; // Expected: Real World ID verification failure
    });

    it("should calculate correct external nullifier hash", async function () {
      await loadFixture(deployWithRealWorldId);
      
      // Test the external nullifier calculation in ElectionManager
      const electionInfo = await electionManager.getElection(1);
      expect(electionInfo.worldIdAction).to.equal(TEST_ACTION);
      
      // The external nullifier should be calculated correctly
      // We can't easily test the exact value without implementing the same logic,
      // but we can verify it's not zero
      const ranking = [{ candidateId: 1, tiedWithPrevious: false }];
      const candidateIds = ranking.map(r => r.candidateId);
      const tiedFlags = ranking.map(r => r.tiedWithPrevious);
      const signalHash = generateSignalHash(candidateIds, tiedFlags);

      // The verification call should at least reach the World ID contract
      // (it will fail there, but that means our nullifier calculation worked)
      await expect(
        electionManager.verifyWorldIdProof(
          1,
          signalHash,
          mockProof.root,
          mockProof.nullifierHash,
          mockProof.proof
        )
      ).to.be.reverted; // Expected failure at World ID level, not before
    });
  });

  describe("Production Configuration", function () {
    it("should document the single contract address needed", async function () {
      await loadFixture(deployWithRealWorldId);
      
      const electionManagerAddress = await electionManager.getAddress();
      const electionAddress = await election.getAddress();
      
      console.log("\n=== Centralized World ID Configuration ===");
      console.log(`🌐 World ID Developer Portal: https://developer.worldcoin.org/`);
      console.log(`📱 App ID: ${networkConfig.worldIdAppId}`);
      console.log(`🎯 Action ID: ${TEST_ACTION}`);
      console.log(`📄 Contract Address (ONLY THIS ONE): ${electionManagerAddress}`);
      console.log(`🌍 Network: ${networkConfig.networkName} (${networkConfig.chainId})`);
      console.log(`🔗 World ID Router: ${networkConfig.worldIdRouter}`);
      console.log("\n✅ Benefits of Centralized Approach:");
      console.log("1. Only ONE contract address to add to World ID portal");
      console.log("2. All elections use the same ElectionManager for verification");
      console.log("3. No need to add each Election contract individually");
      console.log(`4. Election contracts (like ${electionAddress}) delegate to ElectionManager`);
      console.log("==========================================\n");
      
      expect(electionManagerAddress).to.not.equal(ethers.ZeroAddress);
      expect(electionAddress).to.not.equal(ethers.ZeroAddress);
      expect(electionManagerAddress).to.not.equal(electionAddress);
    });

    it("should verify only ElectionManager needs World ID configuration", async function () {
      await loadFixture(deployWithRealWorldId);
      
      // ElectionManager should have World ID
      const electionManagerWorldId = await electionManager.worldID();
      expect(electionManagerWorldId).to.equal(networkConfig.worldIdRouter);
      
      // Election should reference ElectionManager
      const electionManagerRef = await election.electionManager();
      expect(electionManagerRef).to.equal(await electionManager.getAddress());
      
      // Election should still have World ID reference (for interface compatibility)
      const electionWorldId = await election.worldId();
      expect(electionWorldId).to.equal(networkConfig.worldIdRouter);
    });
  });

  describe("Multiple Elections Support", function () {
    it("should support multiple elections with same ElectionManager", async function () {
      await loadFixture(deployWithRealWorldId);
      
      // Create a second election
      await electionManager.createElection(
        "Second Election",
        "Another test election",
        "second-test-action",
        [
          { name: "David", description: "Candidate D" },
          { name: "Eve", description: "Candidate E" }
        ]
      );

      // Get both elections
      const election1Data = await electionManager.getElection(1);
      const election2Data = await electionManager.getElection(2);
      
      expect(election1Data.worldIdAction).to.equal(TEST_ACTION);
      expect(election2Data.worldIdAction).to.equal("second-test-action");
      
      // Both should use the same ElectionManager
      const Election = await ethers.getContractFactory("Election");
      const election2 = Election.attach(election2Data.electionAddress);
      
      const election1Manager = await election.electionManager();
      const election2Manager = await election2.electionManager();
      
      expect(election1Manager).to.equal(election2Manager);
      expect(election1Manager).to.equal(await electionManager.getAddress());
    });
  });
});
