const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing World ID verification on World Chain Sepolia...");
  
  // Use the deployed ElectionManager
  const electionManagerAddress = "0x723C72f06BAf178a31ca5B14439e84512d10fB70";
  const electionAddress = "0x9acF5f311aC4aD0eCa4b6b89B42AeDeF98976d96";
  
  const ElectionManager = await ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(electionManagerAddress);
  
  console.log("📋 ElectionManager:", electionManagerAddress);
  console.log("🗳️  Election:", electionAddress);
  
  try {
    // Get election ID
    const electionId = await electionManager.getElectionIdByAddress(electionAddress);
    console.log("🆔 Election ID:", electionId.toString());
    
    // Get election info
    const electionInfo = await electionManager.elections(electionId);
    console.log("📊 Election Info:");
    console.log("  - Title:", electionInfo.title);
    console.log("  - World ID Action:", electionInfo.worldIdAction);
    console.log("  - Active:", electionInfo.active);
    
    // Test with mock proof data (this will fail verification but should not revert on the call)
    const mockSignal = "0x1234567890123456789012345678901234567890123456789012345678901234";
    const mockRoot = "0x1234567890123456789012345678901234567890123456789012345678901234";
    const mockVoterId = "0x1234567890123456789012345678901234567890123456789012345678901234";
    const mockProof = [
      "0x1234567890123456789012345678901234567890123456789012345678901234",
      "0x1234567890123456789012345678901234567890123456789012345678901234",
      "0x1234567890123456789012345678901234567890123456789012345678901234",
      "0x1234567890123456789012345678901234567890123456789012345678901234",
      "0x1234567890123456789012345678901234567890123456789012345678901234",
      "0x1234567890123456789012345678901234567890123456789012345678901234",
      "0x1234567890123456789012345678901234567890123456789012345678901234",
      "0x1234567890123456789012345678901234567890123456789012345678901234"
    ];
    
    console.log("🔍 Testing World ID verification call...");
    
    try {
      const result = await electionManager.verifyWorldIdProof(
        electionId,
        mockSignal,
        mockRoot,
        mockVoterId,
        mockProof
      );
      console.log("✅ Verification call succeeded (unexpected with mock data):", result);
    } catch (error) {
      console.log("❌ Verification failed as expected with mock data:", error.message);
      
      // Check if it's a World ID verification error (expected) vs other errors
      if (error.message.includes("InvalidProof") || 
          error.message.includes("InvalidRoot") || 
          error.message.includes("verifyProof")) {
        console.log("✅ World ID verification is working - it properly rejected invalid proof");
      } else {
        console.log("⚠️  Unexpected error type:", error.message);
      }
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
