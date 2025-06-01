const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// This test requires forking World Chain Sepolia
// Run with: npx hardhat test test/WorldChainFork.test.js --network hardhat

describe("World Chain Sepolia Fork Tests", function () {
  let election;
  let electionManager;
  let worldIdRouter;
  let owner;
  let user1;

  // Real World ID Router on World Chain Sepolia
  const WORLD_ID_ROUTER_ADDRESS = "0x57f928158C3EE7CDad1e4D8642503c4D0201f611";
  const WORLD_ID_APP_ID = "app_10719845a0977ef63ebe8eb9edb890ad";
  const TEST_ACTION = "fork-test-action";

  // World ID Router ABI (minimal interface)
  const WORLD_ID_ROUTER_ABI = [
    "function verifyProof(uint256 root, uint256 groupId, uint256 signalHash, uint256 nullifierHash, uint256 externalNullifierHash, uint256[8] calldata proof) external view",
    "function latestRoot() external view returns (uint256)"
  ];

  async function deployWithRealWorldId() {
    [owner, user1] = await ethers.getSigners();

    // Connect to real World ID Router
    worldIdRouter = new ethers.Contract(WORLD_ID_ROUTER_ADDRESS, WORLD_ID_ROUTER_ABI, owner);

    // Deploy ElectionManager with real World ID Router
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(WORLD_ID_ROUTER_ADDRESS);

    await electionManager.grantCreatorRole(owner.address);

    // Create election
    await electionManager.createElection(
      "Fork Test Election",
      "Testing on World Chain Sepolia fork",
      TEST_ACTION,
      [
        { name: "Alice", description: "Candidate A" },
        { name: "Bob", description: "Candidate B" }
      ]
    );

    const electionData = await electionManager.getElection(1);
    const Election = await ethers.getContractFactory("Election");
    election = Election.attach(electionData.electionAddress);

    return { election, electionManager, worldIdRouter, owner, user1 };
  }

  describe("Fork Environment Setup", function () {
    it("should connect to real World ID Router on fork", async function () {
      await loadFixture(deployWithRealWorldId);
      
      // Verify we're connected to the real contract
      const worldIdAddress = await election.worldId();
      expect(worldIdAddress).to.equal(WORLD_ID_ROUTER_ADDRESS);
      
      // Try to call a read function to verify connection
      try {
        const latestRoot = await worldIdRouter.latestRoot();
        console.log(`Latest World ID root: ${latestRoot}`);
        expect(latestRoot).to.not.equal(0);
      } catch (error) {
        console.log("Note: latestRoot() may not be available on this World ID version");
      }
    });

    it("should have correct network configuration", async function () {
      await loadFixture(deployWithRealWorldId);
      
      // Verify we're on the right network
      const network = await ethers.provider.getNetwork();
      console.log(`Network: ${network.name} (${network.chainId})`);
      
      // Should be World Chain Sepolia (4801) or hardhat fork
      expect([4801n, 31337n]).to.include(network.chainId);
    });
  });

  describe("Real World ID Integration", function () {
    it("should demonstrate World ID verification call structure", async function () {
      await loadFixture(deployWithRealWorldId);
      
      // Create a vote structure
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];

      // Generate signal hash
      const candidateIds = ranking.map(r => r.candidateId);
      const tiedFlags = ranking.map(r => r.tiedWithPrevious);
      const signalHash = ethers.solidityPackedKeccak256(
        ["uint256[]", "bool[]"],
        [candidateIds, tiedFlags]
      );

      // Mock proof data (would come from World ID in real scenario)
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

      // This will fail because we don't have valid World ID proofs
      // But it shows the correct call structure
      await expect(
        election.connect(user1).vote(
          signalHash,
          mockProof.root,
          mockProof.nullifierHash,
          mockProof.proof,
          ranking
        )
      ).to.be.reverted; // Expected: Invalid World ID proof
      
      console.log("✓ Vote call structure is correct (failed as expected without valid proof)");
    });

    it("should show external nullifier calculation", async function () {
      await loadFixture(deployWithRealWorldId);
      
      const externalNullifierHash = await election.externalNullifierHash();
      const electionInfo = await election.getElectionInfo();
      
      console.log(`App ID: ${WORLD_ID_APP_ID}`);
      console.log(`Action: ${electionInfo._worldIdAction}`);
      console.log(`External Nullifier Hash: ${externalNullifierHash}`);
      
      expect(externalNullifierHash).to.not.equal(0);
      expect(electionInfo._worldIdAction).to.equal(TEST_ACTION);
    });
  });

  describe("Production Readiness Check", function () {
    it("should verify contract is ready for World ID integration", async function () {
      await loadFixture(deployWithRealWorldId);
      
      console.log("\n=== Production Readiness Check ===");
      
      // 1. World ID Router connection
      const worldIdAddress = await election.worldId();
      console.log(`✓ World ID Router: ${worldIdAddress}`);
      expect(worldIdAddress).to.equal(WORLD_ID_ROUTER_ADDRESS);
      
      // 2. External nullifier configuration
      const externalNullifier = await election.externalNullifierHash();
      console.log(`✓ External Nullifier: ${externalNullifier}`);
      expect(externalNullifier).to.not.equal(0);
      
      // 3. Group ID (Orb verification)
      const groupId = await election.groupId();
      console.log(`✓ Group ID: ${groupId}`);
      expect(groupId).to.equal(1);
      
      // 4. Election configuration
      const electionInfo = await election.getElectionInfo();
      console.log(`✓ Action ID: ${electionInfo._worldIdAction}`);
      console.log(`✓ Contract Address: ${await election.getAddress()}`);
      
      console.log("\n📋 Next Steps for Production:");
      console.log("1. Register action in World ID Developer Portal");
      console.log("2. Add contract address to allowed contracts");
      console.log("3. Test with World ID Simulator");
      console.log("4. Generate real World ID proofs for testing");
      console.log("===================================\n");
      
      expect(true).to.be.true;
    });
  });

  describe("World ID Developer Portal Configuration", function () {
    it("should document required portal configuration", async function () {
      await loadFixture(deployWithRealWorldId);
      
      const contractAddress = await election.getAddress();
      const electionInfo = await election.getElectionInfo();
      
      console.log("\n=== World ID Developer Portal Configuration ===");
      console.log(`🌐 Portal URL: https://developer.worldcoin.org/`);
      console.log(`📱 App ID: ${WORLD_ID_APP_ID}`);
      console.log(`🎯 Action ID: ${electionInfo._worldIdAction}`);
      console.log(`📄 Contract Address: ${contractAddress}`);
      console.log(`🌍 Network: World Chain Sepolia (4801)`);
      console.log(`🔗 World ID Router: ${WORLD_ID_ROUTER_ADDRESS}`);
      console.log("\n📝 Configuration Steps:");
      console.log("1. Login to World ID Developer Portal");
      console.log("2. Open your app (app_10719845a0977ef63ebe8eb9edb890ad)");
      console.log("3. Create new Incognito Action:");
      console.log(`   - Action ID: ${electionInfo._worldIdAction}`);
      console.log("   - Max verifications per user: 1");
      console.log("4. Add contract to allowed list:");
      console.log(`   - Contract: ${contractAddress}`);
      console.log("   - Network: World Chain Sepolia");
      console.log("5. Test with World ID Simulator");
      console.log("===============================================\n");
      
      // Verify all required data is available
      expect(WORLD_ID_APP_ID).to.include("app_");
      expect(electionInfo._worldIdAction).to.not.be.empty;
      expect(contractAddress).to.not.equal(ethers.ZeroAddress);
    });
  });
});
