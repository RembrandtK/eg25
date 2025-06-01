const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function testDeployedElections() {
  console.log("🔍 Testing Deployed ElectionManager Contract");
  console.log("=" .repeat(60));

  // Get the deployed contract address from Ignition deployment files
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;

  const deploymentPath = path.join(__dirname, "..", "ignition", "deployments", `chain-${chainId}`, "deployed_addresses.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for network ${network} (chain ${chainId}). Please deploy contracts first.`);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contractAddress = deployedAddresses["ElectionDeployment#ElectionManager"];

  if (!contractAddress) {
    throw new Error(`ElectionManager not found in deployment for network ${network}`);
  }
  
  try {
    // Connect to the deployed contract
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    const electionManager = ElectionManager.attach(contractAddress);
    
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`🌐 Network: ${hre.network.name}`);
    
    // Test 1: Get election count
    console.log("\n🔍 Test 1: Getting election count");
    const electionCount = await electionManager.getElectionCount();
    console.log(`✅ Election count: ${electionCount}`);
    
    if (electionCount === 0n) {
      console.log("⚠️  No elections found in the contract");
      console.log("   This explains why the frontend shows no elections");
      return;
    }
    
    // Test 2: Get all elections using getAllElections()
    console.log("\n🔍 Test 2: Getting all elections using getAllElections()");
    try {
      const allElections = await electionManager.getAllElections();
      console.log(`✅ getAllElections() returned ${allElections.length} elections:`);
      
      allElections.forEach((election, index) => {
        console.log(`\n   Election ${index + 1}:`);
        console.log(`     ID: ${election.id}`);
        console.log(`     Title: "${election.title}"`);
        console.log(`     Description: "${election.description}"`);
        console.log(`     World ID Action: "${election.worldIdAction}"`);
        console.log(`     Creator: ${election.creator}`);
        console.log(`     Election Address: ${election.electionAddress}`);
        console.log(`     Active: ${election.active}`);
        console.log(`     Created At: ${new Date(Number(election.createdAt) * 1000).toISOString()}`);
      });
    } catch (error) {
      console.log(`❌ getAllElections() failed: ${error.message}`);
    }
    
    // Test 3: Get elections one by one using getElection()
    console.log("\n🔍 Test 3: Getting elections individually using getElection()");
    for (let i = 1; i <= Number(electionCount); i++) {
      try {
        const election = await electionManager.getElection(i);
        console.log(`\n   Election ${i} (individual call):`);
        console.log(`     ID: ${election.id}`);
        console.log(`     Title: "${election.title}"`);
        console.log(`     Description: "${election.description}"`);
        console.log(`     World ID Action: "${election.worldIdAction}"`);
        console.log(`     Creator: ${election.creator}`);
        console.log(`     Election Address: ${election.electionAddress}`);
        console.log(`     Active: ${election.active}`);
        console.log(`     Created At: ${new Date(Number(election.createdAt) * 1000).toISOString()}`);
      } catch (error) {
        console.log(`❌ getElection(${i}) failed: ${error.message}`);
      }
    }
    
    // Test 4: Get active elections only
    console.log("\n🔍 Test 4: Getting active elections using getActiveElections()");
    try {
      const activeElections = await electionManager.getActiveElections();
      console.log(`✅ getActiveElections() returned ${activeElections.length} active elections:`);
      
      activeElections.forEach((election, index) => {
        console.log(`\n   Active Election ${index + 1}:`);
        console.log(`     ID: ${election.id}`);
        console.log(`     Title: "${election.title}"`);
        console.log(`     Description: "${election.description}"`);
        console.log(`     Active: ${election.active}`);
      });
    } catch (error) {
      console.log(`❌ getActiveElections() failed: ${error.message}`);
    }
    
    // Test 5: Test the elections mapping directly (what the frontend is trying to do)
    console.log("\n🔍 Test 5: Testing elections mapping directly");
    for (let i = 1; i <= Number(electionCount); i++) {
      try {
        const election = await electionManager.elections(i);
        console.log(`\n   Election ${i} (mapping access):`);
        console.log(`     Raw result:`, election);
        console.log(`     ID: ${election[0]}`);
        console.log(`     Title: "${election[1]}"`);
        console.log(`     Description: "${election[2]}"`);
        console.log(`     World ID Action: "${election[3]}"`);
        console.log(`     Creator: ${election[4]}`);
        console.log(`     Election Address: ${election[5]}`);
        console.log(`     Created At: ${election[6]}`);
        console.log(`     Active: ${election[7]}`);
      } catch (error) {
        console.log(`❌ elections(${i}) mapping access failed: ${error.message}`);
      }
    }
    
    console.log("\n🎉 Contract data retrieval test completed!");
    
  } catch (error) {
    console.error("❌ Error connecting to contract:", error.message);
    console.log("\nPossible issues:");
    console.log("1. Contract not deployed to this network");
    console.log("2. Wrong contract address");
    console.log("3. Network connection issues");
  }
}

// Run the test
testDeployedElections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
