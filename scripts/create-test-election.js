const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🗳️  Creating test election with universal 'vote' action...");

  // Get the deployed contract address from Ignition deployment files
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;

  const deploymentPath = path.join(__dirname, "..", "ignition", "deployments", `chain-${chainId}`, "deployed_addresses.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for network ${network} (chain ${chainId}). Please deploy contracts first.`);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const electionManagerAddress = deployedAddresses["ElectionDeployment#ElectionManager"];

  if (!electionManagerAddress) {
    throw new Error(`ElectionManager not found in deployment for network ${network}`);
  }

  const [deployer] = await ethers.getSigners();
  console.log("👤 Using account:", deployer.address);

  // Connect to the deployed ElectionManager
  const ElectionManager = await ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(electionManagerAddress);

  console.log("📋 ElectionManager:", electionManagerAddress);
  
  try {
    // Check the universal action
    const universalAction = await electionManager.UNIVERSAL_WORLD_ID_ACTION();
    console.log("🎯 Universal World ID Action:", universalAction);

    // Check if deployer has creator role
    const hasCreatorRole = await electionManager.canCreateElections(deployer.address);
    console.log("🔑 Has creator role:", hasCreatorRole);

    if (!hasCreatorRole) {
      console.log("🔑 Granting creator role...");
      await electionManager.grantCreatorRole(deployer.address);
      console.log("✅ Creator role granted");
    }

    // Check for existing elections
    const electionCount = await electionManager.getElectionCount();
    console.log("📊 Existing elections:", electionCount.toString());

    if (electionCount > 0) {
      console.log("✅ Test elections already exist. Listing them:");
      const allElections = await electionManager.getAllElections();
      allElections.forEach((election, index) => {
        console.log(`${index + 1}. ${election.title} (${election.active ? 'Active' : 'Inactive'})`);
        console.log(`   Address: ${election.electionAddress}`);
        console.log(`   Action: ${election.worldIdAction}`);
      });
      return;
    }

    // Create test election with universal "vote" action
    console.log("🗳️  Creating test election...");
    const tx = await electionManager.createElection(
      "Universal Vote Test Election",
      "Test election using universal 'vote' action for World ID verification",
      [
        { name: "Alice Johnson", description: "Community leader and advocate" },
        { name: "Bob Smith", description: "Technology and innovation expert" },
        { name: "Carol Davis", description: "Environmental sustainability champion" }
      ]
    );
    
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Election created successfully!");
    console.log("📄 Transaction hash:", receipt.hash);
    
    // Get the election details
    const electionCount = await electionManager.getElectionCount();
    console.log("📊 Total elections:", electionCount.toString());
    
    const election = await electionManager.getElection(electionCount);
    console.log("\n📋 Election Details:");
    console.log("🆔 ID:", election.id.toString());
    console.log("📝 Title:", election.title);
    console.log("📄 Description:", election.description);
    console.log("🎯 World ID Action:", election.worldIdAction);
    console.log("🗳️  Election Contract:", election.electionAddress);
    console.log("👤 Creator:", election.creator);
    console.log("✅ Active:", election.active);
    
    console.log("\n🎯 World ID Configuration:");
    console.log("==========================");
    console.log("✅ Action 'vote' already exists - no registration needed!");
    console.log("📋 Add ElectionManager to World ID Developer Portal:");
    console.log(`   Contract: ${electionManagerAddress}`);
    console.log("   Network: World Chain Sepolia (4801)");
    console.log("   Action: vote");
    console.log("==========================");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
