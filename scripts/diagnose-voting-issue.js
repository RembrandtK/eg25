const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Diagnosing voting issue...");
  
  const electionManagerAddress = "0x26083Ce802F2Ca8CFFF2b7746b8FF291465E914a";
  const electionManager = await ethers.getContractAt("ElectionManager", electionManagerAddress);
  
  console.log("📋 ElectionManager:", electionManagerAddress);
  
  try {
    // Check basic ElectionManager state
    const universalAction = await electionManager.UNIVERSAL_WORLD_ID_ACTION();
    console.log("🎯 Universal action:", universalAction);
    
    const electionCount = await electionManager.getElectionCount();
    console.log("📊 Election count:", electionCount.toString());
    
    if (electionCount.toString() === "0") {
      console.log("❌ NO ELECTIONS EXIST - This is likely the issue!");
      console.log("💡 The app is trying to vote in an election that doesn't exist.");
      
      // Create a test election
      console.log("\n🗳️  Creating a test election...");
      const [deployer] = await ethers.getSigners();
      
      const hasRole = await electionManager.canCreateElections(deployer.address);
      console.log("🔑 Can create elections:", hasRole);
      
      if (!hasRole) {
        console.log("🔑 Granting creator role...");
        await electionManager.grantCreatorRole(deployer.address);
        console.log("✅ Creator role granted");
      }
      
      const tx = await electionManager.createElection(
        "Test Election",
        "A test election for debugging voting issues",
        [
          { name: "Alice Johnson", description: "Community leader" },
          { name: "Bob Smith", description: "Tech advocate" },
          { name: "Carol Davis", description: "Environmental champion" }
        ]
      );
      
      console.log("⏳ Creating election...");
      await tx.wait();
      console.log("✅ Test election created!");
      
      const newCount = await electionManager.getElectionCount();
      console.log("📊 New election count:", newCount.toString());
    }
    
    // List all elections
    const allElections = await electionManager.getAllElections();
    console.log("\n📋 All Elections:");
    
    for (let i = 0; i < allElections.length; i++) {
      const election = allElections[i];
      console.log(`\n${i + 1}. ${election.title}`);
      console.log(`   ID: ${election.id}`);
      console.log(`   Address: ${election.electionAddress}`);
      console.log(`   Action: ${election.worldIdAction}`);
      console.log(`   Active: ${election.active}`);
      console.log(`   Creator: ${election.creator}`);
      
      // Check election contract details
      try {
        const electionContract = await ethers.getContractAt("Election", election.electionAddress);
        const candidateCount = await electionContract.candidateCount();
        console.log(`   Candidates: ${candidateCount}`);
        
        // List candidates
        for (let j = 1; j <= candidateCount; j++) {
          const candidate = await electionContract.candidates(j);
          console.log(`     ${j}. ${candidate.name} (${candidate.active ? 'Active' : 'Inactive'})`);
        }
        
        const voteCount = await electionContract.getVoteCount();
        console.log(`   Votes: ${voteCount}`);
        
      } catch (error) {
        console.log(`   ❌ Error reading election contract: ${error.message}`);
      }
    }
    
    console.log("\n🎯 Diagnosis Summary:");
    if (allElections.length === 0) {
      console.log("❌ No elections exist - this is why voting fails");
      console.log("💡 Solution: Create an election first");
    } else {
      console.log("✅ Elections exist");
      console.log("💡 Check if the app is using the correct election address");
      console.log("💡 Check if candidates are active and valid");
      console.log("💡 Check the transaction parameters in the app");
    }
    
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
