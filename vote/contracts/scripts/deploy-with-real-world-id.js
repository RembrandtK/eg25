#!/usr/bin/env node

/**
 * Deploy ElectionManager with network-specific World ID Router
 * 
 * Usage:
 *   # Deploy to local hardhat network with mock World ID
 *   npx hardhat run scripts/deploy-with-real-world-id.js
 * 
 *   # Deploy to World Chain Sepolia with real World ID
 *   npx hardhat run scripts/deploy-with-real-world-id.js --network worldchain-sepolia
 * 
 *   # Deploy to local with real World ID (for testing)
 *   USE_MOCK_WORLD_ID=false npx hardhat run scripts/deploy-with-real-world-id.js
 */

const { ethers } = require("hardhat");
const { getNetworkConfig, getNetworkName, supportsWorldId } = require("../config/networks");

async function main() {
  console.log("🚀 Deploying ElectionManager with Network-Specific World ID");
  console.log("==========================================================\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkName = network.name;
  
  console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);
  console.log(`🌐 Human-readable: ${getNetworkName(chainId)}`);

  // Check if network supports World ID
  if (!supportsWorldId(chainId)) {
    console.error(`❌ Error: World ID is not supported on chain ID ${chainId}`);
    console.log("Supported networks:", Object.keys(require("../config/networks").WORLD_ID_ADDRESSES));
    process.exit(1);
  }

  // Get network configuration
  const config = getNetworkConfig(networkName, chainId);
  console.log(`🔗 World ID Router: ${config.worldIdRouter}`);
  console.log(`📱 World ID App ID: ${config.worldIdAppId}`);
  console.log(`🧪 Is Testnet: ${config.isTestnet}`);
  console.log(`🏠 Is Local: ${config.isLocal}`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    console.error("❌ Error: Deployer has no ETH balance");
    process.exit(1);
  }

  try {
    // Deploy ElectionManager
    console.log("🏗️  Deploying ElectionManager...");
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    const electionManager = await ElectionManager.deploy(config.worldIdRouter);
    
    console.log("⏳ Waiting for deployment confirmation...");
    await electionManager.waitForDeployment();
    
    const electionManagerAddress = await electionManager.getAddress();
    console.log(`✅ ElectionManager deployed: ${electionManagerAddress}`);

    // Verify World ID configuration
    console.log("\n🔍 Verifying World ID configuration...");
    const deployedWorldIdAddress = await electionManager.worldID();
    console.log(`✅ Configured World ID Router: ${deployedWorldIdAddress}`);
    
    if (deployedWorldIdAddress.toLowerCase() !== config.worldIdRouter.toLowerCase()) {
      console.error("❌ Error: World ID Router address mismatch!");
      process.exit(1);
    }

    // Grant creator role to deployer
    console.log("\n🔑 Granting creator role to deployer...");
    await electionManager.grantCreatorRole(deployer.address);
    console.log("✅ Creator role granted");

    // Create a test election
    console.log("\n🗳️  Creating test election...");

    await electionManager.createElection(
      "Network Test Election",
      `Test election deployed on ${getNetworkName(chainId)} using universal 'vote' action`,
      [
        { name: "Alice Johnson", description: "Community leader" },
        { name: "Bob Smith", description: "Tech advocate" },
        { name: "Carol Davis", description: "Environmental champion" }
      ]
    );
    console.log("✅ Test election created");

    // Get election details
    const electionData = await electionManager.getElection(1);
    console.log(`✅ Election contract: ${electionData.electionAddress}`);

    // Verify Election contract configuration
    console.log("\n🔍 Verifying Election contract configuration...");
    const Election = await ethers.getContractFactory("Election");
    const election = Election.attach(electionData.electionAddress);
    
    const electionWorldId = await election.worldId();
    const electionManagerRef = await election.electionManager();
    
    console.log(`✅ Election World ID Router: ${electionWorldId}`);
    console.log(`✅ Election Manager Reference: ${electionManagerRef}`);

    // Summary
    console.log("\n📋 Deployment Summary");
    console.log("=====================");
    console.log(`🌐 Network: ${getNetworkName(chainId)} (${chainId})`);
    console.log(`🔗 World ID Router: ${config.worldIdRouter}`);
    console.log(`📄 ElectionManager: ${electionManagerAddress}`);
    console.log(`🗳️  Test Election: ${electionData.electionAddress}`);
    console.log(`🎯 Universal Action: vote`);

    console.log("\n📝 World ID Developer Portal Configuration");
    console.log("==========================================");
    console.log(`🌐 Portal: https://developer.worldcoin.org/`);
    console.log(`📱 App ID: ${config.worldIdAppId}`);
    console.log(`🎯 Action ID: vote (universal action - already exists!)`);
    console.log(`📄 Contract Address: ${electionManagerAddress}`);
    console.log(`🌍 Network: ${getNetworkName(chainId)} (${chainId})`);

    if (config.isTestnet) {
      console.log("\n✅ Ready for testing on testnet!");
      console.log("✅ Action 'vote' already exists - no registration needed");
      console.log("1. Add the ElectionManager contract to allowed list");
      console.log("2. Test voting with World ID verification");
    } else {
      console.log("\n⚠️  Production deployment detected!");
      console.log("1. Verify all configurations are correct");
      console.log("✅ Action 'vote' already exists - no registration needed");
      console.log("2. Add the ElectionManager contract to allowed list");
      console.log("3. Test thoroughly before announcing");
    }

    console.log("\n🎉 Deployment completed successfully!");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Helper function to check if we can connect to World ID Router
async function checkWorldIdConnection(worldIdAddress) {
  try {
    const worldIdAbi = [
      "function latestRoot() external view returns (uint256)"
    ];
    
    const worldId = new ethers.Contract(worldIdAddress, worldIdAbi, ethers.provider);
    const root = await worldId.latestRoot();
    console.log(`✅ World ID Router is accessible, latest root: ${root}`);
    return true;
  } catch (error) {
    console.log(`⚠️  Could not connect to World ID Router: ${error.message}`);
    return false;
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
