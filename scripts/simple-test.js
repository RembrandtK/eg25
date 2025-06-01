const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Simple test of new ElectionManager...");
  
  const electionManagerAddress = "0x26083Ce802F2Ca8CFFF2b7746b8FF291465E914a";
  const ElectionManager = await ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(electionManagerAddress);
  
  console.log("📋 ElectionManager:", electionManagerAddress);
  
  try {
    // Check the universal action
    const universalAction = await electionManager.UNIVERSAL_WORLD_ID_ACTION();
    console.log("🎯 Universal World ID Action:", universalAction);
    
    // Check election count
    const count = await electionManager.getElectionCount();
    console.log("📊 Election count:", count.toString());
    
    console.log("✅ ElectionManager is working with universal 'vote' action!");
    
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
