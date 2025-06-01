const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  console.log(`🌐 Network: ${networkName}`);
  
  // Get deployed addresses
  const deploymentPath = path.join(__dirname, "..", "ignition", "deployments", `chain-4801`, "deployed_addresses.json");
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const electionManagerAddress = deployedAddresses["ElectionDeployment#ElectionManager"];

  if (!electionManagerAddress) {
    throw new Error("ElectionManager address not found in deployment");
  }

  console.log(`📍 ElectionManager Address: ${electionManagerAddress}`);
  
  // Connect to ElectionManager
  const ElectionManager = await hre.ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(electionManagerAddress);
  
  // Get all elections
  console.log("\n🗳️ Getting all elections...");
  const allElections = await electionManager.getAllElections();
  console.log(`Found ${allElections.length} elections`);
  
  // Check candidates for each election
  for (let i = 0; i < allElections.length; i++) {
    const election = allElections[i];
    console.log(`\n📋 Election ${i + 1}: "${election.title}"`);
    console.log(`   Address: ${election.electionAddress}`);
    console.log(`   World ID Action: ${election.worldIdAction}`);
    
    try {
      // Connect to the individual Election contract
      const Election = await hre.ethers.getContractFactory("Election");
      const electionContract = Election.attach(election.electionAddress);
      
      // Get candidate count
      const candidateCount = await electionContract.candidateCount();
      console.log(`   Candidate Count: ${candidateCount}`);
      
      if (candidateCount > 0) {
        console.log(`   Candidates:`);
        for (let j = 1; j <= Number(candidateCount); j++) {
          const candidate = await electionContract.candidates(j);
          console.log(`     ${j}. ${candidate.name} - ${candidate.description} (Active: ${candidate.active})`);
        }
        
        // Also test getCandidates() function
        const allCandidates = await electionContract.getCandidates();
        console.log(`   getCandidates() returned ${allCandidates.length} candidates`);
      } else {
        console.log(`   ⚠️ No candidates found in this election!`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error checking candidates: ${error.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
