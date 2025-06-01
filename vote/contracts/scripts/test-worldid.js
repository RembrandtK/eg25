const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing World ID verification directly...");
  
  const electionManager = await ethers.getContractAt("ElectionManager", "0x26083Ce802F2Ca8CFFF2b7746b8FF291465E914a");
  const electionAddress = "0x364B45B190Ee4Aef9920Fa3D9E086dE58C1C2545";
  
  try {
    const electionId = await electionManager.getElectionIdByAddress(electionAddress);
    console.log("Election ID:", electionId.toString());
    
    // Test with mock data
    const mockSignal = "0x1234567890123456789012345678901234567890123456789012345678901234";
    const mockRoot = "0x1234567890123456789012345678901234567890123456789012345678901234";
    const mockVoterId = "0x1234567890123456789012345678901234567890123456789012345678901234";
    const mockProof = [
      "0x1111111111111111111111111111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333333333333333333333333333",
      "0x4444444444444444444444444444444444444444444444444444444444444444",
      "0x5555555555555555555555555555555555555555555555555555555555555555",
      "0x6666666666666666666666666666666666666666666666666666666666666666",
      "0x7777777777777777777777777777777777777777777777777777777777777777",
      "0x8888888888888888888888888888888888888888888888888888888888888888"
    ];
    
    console.log("Testing World ID verification...");
    
    try {
      const result = await electionManager.verifyWorldIdProof(
        electionId,
        mockSignal,
        mockRoot,
        mockVoterId,
        mockProof
      );
      console.log("Verification result:", result);
    } catch (error) {
      console.log("Verification failed (expected):", error.message);
      
      if (error.message.includes("InvalidProof") || error.message.includes("verifyProof")) {
        console.log("✅ World ID verification is working correctly");
      } else {
        console.log("⚠️ Unexpected error type");
      }
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main().catch(console.error);
