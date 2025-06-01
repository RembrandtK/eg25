const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking if election is registered in ElectionManager...");
  
  const electionManagerAddress = "0x26083Ce802F2Ca8CFFF2b7746b8FF291465E914a";
  const electionAddress = "0x364B45B190Ee4Aef9920Fa3D9E086dE58C1C2545";
  
  const electionManager = await ethers.getContractAt("ElectionManager", electionManagerAddress);
  
  try {
    // Check if election is registered
    const electionId = await electionManager.getElectionIdByAddress(electionAddress);
    console.log("✅ Election ID:", electionId.toString());
    
    if (electionId.toString() === "0") {
      console.log("❌ PROBLEM FOUND: Election is not registered in ElectionManager!");
      console.log("This is why the transaction fails - getElectionIdByAddress returns 0");
      
      // Check all elections
      const count = await electionManager.getElectionCount();
      console.log("📊 Total elections in manager:", count.toString());
      
      if (count > 0) {
        const allElections = await electionManager.getAllElections();
        console.log("📋 Registered elections:");
        allElections.forEach((election, i) => {
          console.log(`  ${i + 1}. ${election.title} at ${election.electionAddress}`);
        });
      }
    } else {
      console.log("✅ Election is properly registered");
      const election = await electionManager.getElection(electionId);
      console.log("📋 Election details:");
      console.log("  Title:", election.title);
      console.log("  Address:", election.electionAddress);
      console.log("  Active:", election.active);
    }
    
  } catch (error) {
    console.error("❌ Error checking election registration:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
