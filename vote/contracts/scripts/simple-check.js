const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking ElectionManager...");
  
  const electionManagerAddress = "0x26083Ce802F2Ca8CFFF2b7746b8FF291465E914a";
  const ElectionManager = await ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(electionManagerAddress);
  
  const universalAction = await electionManager.UNIVERSAL_WORLD_ID_ACTION();
  console.log("Universal action:", universalAction);
  
  const count = await electionManager.getElectionCount();
  console.log("Election count:", count.toString());
}

main().catch(console.error);
