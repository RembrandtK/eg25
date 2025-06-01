// Test what the contract configuration is actually returning
async function testContractConfig() {
  console.log("🧪 Testing contract configuration...");
  
  try {
    // Import the same way the hook does
    const { CURRENT_NETWORK, ELECTION_MANAGER_ADDRESS } = require('./src/config/contracts.ts');
    
    console.log("✅ Contract config imported successfully");
    console.log("🔍 CURRENT_NETWORK:", CURRENT_NETWORK);
    console.log("🔍 ELECTION_MANAGER_ADDRESS:", ELECTION_MANAGER_ADDRESS);
    console.log("🔍 Expected address: 0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC");
    console.log("🔍 Addresses match:", ELECTION_MANAGER_ADDRESS === "0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC");
    
  } catch (error) {
    console.error("❌ Error importing contract config:", error.message);
    
    // Try alternative import method
    try {
      console.log("🔄 Trying alternative import...");
      
      // Set environment to match app
      process.env.NEXT_PUBLIC_CHAIN_ID = "4801";
      
      const contractsModule = require('./src/config/contracts.ts');
      console.log("📋 Available exports:", Object.keys(contractsModule));
      
      if (contractsModule.ELECTION_MANAGER_ADDRESS) {
        console.log("✅ ELECTION_MANAGER_ADDRESS found:", contractsModule.ELECTION_MANAGER_ADDRESS);
      } else {
        console.log("❌ ELECTION_MANAGER_ADDRESS not found in exports");
      }
      
    } catch (altError) {
      console.error("❌ Alternative import also failed:", altError.message);
    }
  }
}

testContractConfig().catch(console.error);
