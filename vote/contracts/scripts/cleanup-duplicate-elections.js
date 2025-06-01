const { ethers } = require("hardhat");

async function main() {
  console.log("🧹 Cleaning up duplicate elections...");

  // Get the deployed ElectionManager address
  const ELECTION_MANAGER_ADDRESS = "0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC";
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get ElectionManager contract
  const ElectionManager = await ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(ELECTION_MANAGER_ADDRESS);

  // Check if deployer has ADMIN_ROLE to deactivate elections
  const ADMIN_ROLE = await electionManager.ADMIN_ROLE();
  const hasAdminRole = await electionManager.hasRole(ADMIN_ROLE, deployer.address);

  if (!hasAdminRole) {
    console.log("❌ Account does not have ADMIN_ROLE");
    console.log("Cannot deactivate elections");
    return;
  }

  console.log("✅ Account has ADMIN_ROLE");

  // Get all elections
  console.log("\n🔍 Getting all elections...");
  const allElections = await electionManager.getAllElections();
  console.log(`Found ${allElections.length} elections`);

  // Group elections by title to identify duplicates
  const electionGroups = {};
  
  for (const election of allElections) {
    const title = election.title;
    if (!electionGroups[title]) {
      electionGroups[title] = [];
    }
    electionGroups[title].push(election);
  }

  console.log("\n📊 Election groups by title:");
  for (const [title, elections] of Object.entries(electionGroups)) {
    console.log(`\n"${title}": ${elections.length} elections`);
    elections.forEach((election, index) => {
      console.log(`  ${index + 1}. ID: ${election.id}, Active: ${election.active}, Action: ${election.worldIdAction}`);
    });
  }

  // Identify duplicates to deactivate
  const electionsToDeactivate = [];
  
  for (const [title, elections] of Object.entries(electionGroups)) {
    if (elections.length > 1) {
      // Keep the first election (lowest ID) active, deactivate the rest
      const activeElections = elections.filter(e => e.active);
      if (activeElections.length > 1) {
        // Sort by ID and keep the first one
        activeElections.sort((a, b) => Number(a.id) - Number(b.id));
        const toKeep = activeElections[0];
        const toDeactivate = activeElections.slice(1);
        
        console.log(`\n🎯 For "${title}":`);
        console.log(`   Keeping: Election ID ${toKeep.id} (${toKeep.worldIdAction})`);
        console.log(`   Deactivating: ${toDeactivate.map(e => `ID ${e.id}`).join(', ')}`);
        
        electionsToDeactivate.push(...toDeactivate);
      }
    }
  }

  if (electionsToDeactivate.length === 0) {
    console.log("\n✅ No duplicate elections found to deactivate!");
    return;
  }

  console.log(`\n🗑️  Will deactivate ${electionsToDeactivate.length} duplicate elections:`);
  electionsToDeactivate.forEach(election => {
    console.log(`   - Election ID ${election.id}: "${election.title}" (${election.worldIdAction})`);
  });

  // Ask for confirmation (in a real script, you might want to add a prompt)
  console.log("\n⚠️  This will deactivate the duplicate elections listed above.");
  console.log("💡 The elections will still exist but will be marked as inactive.");
  
  // Deactivate duplicate elections
  for (const election of electionsToDeactivate) {
    try {
      console.log(`\n🔄 Deactivating Election ID ${election.id}...`);
      const tx = await electionManager.deactivateElection(election.id);
      console.log(`   Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Deactivated in block: ${receipt.blockNumber}`);
      
    } catch (error) {
      console.error(`   ❌ Failed to deactivate Election ID ${election.id}:`, error.message);
    }
  }

  // Verify the cleanup
  console.log("\n🔍 Verifying cleanup...");
  const updatedElections = await electionManager.getAllElections();
  const activeElections = updatedElections.filter(e => e.active);
  
  console.log(`\nFinal state:`);
  console.log(`   Total elections: ${updatedElections.length}`);
  console.log(`   Active elections: ${activeElections.length}`);
  
  console.log("\n📋 Active elections after cleanup:");
  activeElections.forEach(election => {
    console.log(`   - ID ${election.id}: "${election.title}" (${election.worldIdAction})`);
  });

  console.log("\n🎉 Cleanup completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
