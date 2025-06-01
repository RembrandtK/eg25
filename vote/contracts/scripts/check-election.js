const { ethers } = require("hardhat");

async function main() {
  const electionManager = await ethers.getContractAt("ElectionManager", "0x26083Ce802F2Ca8CFFF2b7746b8FF291465E914a");
  const electionAddress = "0x364B45B190Ee4Aef9920Fa3D9E086dE58C1C2545";
  
  try {
    const electionId = await electionManager.getElectionIdByAddress(electionAddress);
    console.log("Election ID:", electionId.toString());
    
    if (electionId.toString() === "0") {
      console.log("❌ Election not registered in ElectionManager!");
    } else {
      console.log("✅ Election is registered");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main().catch(console.error);
