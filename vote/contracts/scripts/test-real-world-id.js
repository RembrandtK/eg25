#!/usr/bin/env node

/**
 * Script to test Real World ID integration
 * 
 * This script demonstrates how to:
 * 1. Deploy contracts with real World ID Router
 * 2. Test World ID integration structure
 * 3. Verify configuration for production
 * 
 * Usage:
 *   # Test with local hardhat network (mock)
 *   npx hardhat run scripts/test-real-world-id.js
 * 
 *   # Test with World Chain Sepolia fork
 *   npx hardhat run scripts/test-real-world-id.js --network worldchain-sepolia-fork
 */

const { ethers } = require("hardhat");

// Configuration
const WORLD_ID_ROUTER_ADDRESS = "0x57f928158C3EE7CDad1e4D8642503c4D0201f611";
const WORLD_ID_APP_ID = "app_10719845a0977ef63ebe8eb9edb890ad";
const TEST_ACTION = "script-test-action";

async function main() {
  console.log("🧪 Testing Real World ID Integration");
  console.log("=====================================\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Get signers
  const [deployer, user] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`👤 User: ${user.address}\n`);

  try {
    // Step 1: Deploy ElectionManager with real World ID
    console.log("🚀 Deploying ElectionManager with real World ID Router...");
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    const electionManager = await ElectionManager.deploy(WORLD_ID_ROUTER_ADDRESS);
    await electionManager.waitForDeployment();
    
    const electionManagerAddress = await electionManager.getAddress();
    console.log(`✅ ElectionManager deployed: ${electionManagerAddress}`);

    // Step 2: Grant creator role
    console.log("\n🔑 Granting creator role...");
    await electionManager.grantCreatorRole(deployer.address);
    console.log("✅ Creator role granted");

    // Step 3: Create election
    console.log("\n🗳️  Creating election with real World ID action...");
    await electionManager.createElection(
      "Real World ID Test Election",
      "Testing integration with actual World ID Router",
      TEST_ACTION,
      [
        { name: "Alice Johnson", description: "Community leader" },
        { name: "Bob Smith", description: "Tech advocate" },
        { name: "Carol Davis", description: "Environmental champion" }
      ]
    );
    console.log("✅ Election created");

    // Step 4: Get election contract
    const electionData = await electionManager.getElection(1);
    const Election = await ethers.getContractFactory("Election");
    const election = Election.attach(electionData.electionAddress);
    
    const electionAddress = await election.getAddress();
    console.log(`✅ Election contract: ${electionAddress}`);

    // Step 5: Verify World ID configuration
    console.log("\n🔍 Verifying World ID configuration...");
    
    const worldIdAddress = await election.worldId();
    const externalNullifierHash = await election.externalNullifierHash();
    const groupId = await election.groupId();
    const electionInfo = await election.getElectionInfo();
    
    console.log(`✅ World ID Router: ${worldIdAddress}`);
    console.log(`✅ External Nullifier: ${externalNullifierHash}`);
    console.log(`✅ Group ID: ${groupId}`);
    console.log(`✅ Action ID: ${electionInfo._worldIdAction}`);

    // Step 6: Test vote structure (will fail without real proof)
    console.log("\n🧪 Testing vote structure...");
    
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

    console.log(`✅ Signal hash generated: ${signalHash}`);

    // Mock proof (would come from World ID in real scenario)
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

    // Try to vote (expected to fail without valid proof)
    console.log("🔄 Attempting vote with mock proof (expected to fail)...");
    try {
      await election.connect(user).vote(
        signalHash,
        mockProof.root,
        mockProof.nullifierHash,
        mockProof.proof,
        ranking
      );
      console.log("❌ Unexpected: Vote succeeded with mock proof!");
    } catch (error) {
      console.log("✅ Expected: Vote failed with mock proof");
      console.log(`   Error: ${error.message.split('\n')[0]}`);
    }

    // Step 7: Production configuration summary
    console.log("\n📋 Production Configuration Summary");
    console.log("===================================");
    console.log(`🌐 World ID Developer Portal: https://developer.worldcoin.org/`);
    console.log(`📱 App ID: ${WORLD_ID_APP_ID}`);
    console.log(`🎯 Action ID: ${electionInfo._worldIdAction}`);
    console.log(`📄 Contract Address: ${electionAddress}`);
    console.log(`🌍 Network: World Chain Sepolia (4801)`);
    console.log(`🔗 World ID Router: ${WORLD_ID_ROUTER_ADDRESS}`);
    
    console.log("\n📝 Required Steps:");
    console.log("1. ✅ Contract deployed with real World ID Router");
    console.log("2. ⏳ Register action in World ID Developer Portal");
    console.log("3. ⏳ Add contract address to allowed contracts list");
    console.log("4. ⏳ Test with World ID Simulator");
    console.log("5. ⏳ Generate real World ID proofs for testing");

    console.log("\n🎉 Real World ID integration test completed!");
    
  } catch (error) {
    console.error("❌ Error during testing:", error);
    process.exit(1);
  }
}

// Helper function to check if we're on a fork
async function checkNetworkType() {
  try {
    const network = await ethers.provider.getNetwork();
    const code = await ethers.provider.getCode(WORLD_ID_ROUTER_ADDRESS);
    
    if (code === "0x") {
      console.log("⚠️  World ID Router not found - using local network");
      return "local";
    } else {
      console.log("✅ World ID Router found - using fork or testnet");
      return "fork";
    }
  } catch (error) {
    console.log("⚠️  Network check failed - assuming local");
    return "local";
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
