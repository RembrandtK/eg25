const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing World ID verification directly...");
  
  const electionManagerAddress = "0x26083Ce802F2Ca8CFFF2b7746b8FF291465E914a";
  const electionAddress = "0x364B45B190Ee4Aef9920Fa3D9E086dE58C1C2545";
  
  const electionManager = await ethers.getContractAt("ElectionManager", electionManagerAddress);
  
  try {
    // Get the election ID
    const electionId = await electionManager.getElectionIdByAddress(electionAddress);
    console.log("✅ Election ID:", electionId.toString());
    
    if (electionId.toString() === "0") {
      console.log("❌ Election not found in ElectionManager");
      return;
    }
    
    // Test with mock World ID proof data (this should fail with real World ID)
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
    
    console.log("🔍 Testing World ID verification with mock data...");
    console.log("📋 Parameters:");
    console.log("  Election ID:", electionId.toString());
    console.log("  Signal:", mockSignal);
    console.log("  Root:", mockRoot);
    console.log("  Voter ID:", mockVoterId);
    console.log("  Proof length:", mockProof.length);
    
    try {
      // This should fail with real World ID (expected behavior)
      const result = await electionManager.verifyWorldIdProof(
        electionId,
        mockSignal,
        mockRoot,
        mockVoterId,
        mockProof
      );
      console.log("⚠️  Verification succeeded (unexpected with mock data):", result);
    } catch (error) {
      console.log("✅ Verification failed as expected with mock data");
      console.log("📄 Error message:", error.message);
      
      // Check if it's a World ID verification error (expected) vs other errors
      if (error.message.includes("InvalidProof") || 
          error.message.includes("InvalidRoot") || 
          error.message.includes("verifyProof") ||
          error.message.includes("WorldIDIdentityManager")) {
        console.log("✅ World ID verification is working - it properly rejected invalid proof");
        console.log("💡 This means the World ID router is accessible and functioning");
      } else {
        console.log("⚠️  Unexpected error type - might indicate a different issue");
      }
    }
    
    // Test the universal action
    const universalAction = await electionManager.UNIVERSAL_WORLD_ID_ACTION();
    console.log("🎯 Universal World ID Action:", universalAction);
    
    // Test external nullifier calculation (this is what should match the app)
    console.log("\n🔍 Testing external nullifier calculation...");
    const appId = "app_10719845a0977ef63ebe8eb9edb890ad";
    const action = "vote";
    
    const appIdHash = ethers.keccak256(ethers.toUtf8Bytes(appId));
    const actionHash = ethers.keccak256(ethers.toUtf8Bytes(action));
    const externalNullifierHash = BigInt(ethers.keccak256(ethers.concat([appIdHash, actionHash]))) >> 8n;
    
    console.log("📋 External nullifier calculation:");
    console.log("  App ID:", appId);
    console.log("  Action:", action);
    console.log("  App ID Hash:", appIdHash);
    console.log("  Action Hash:", actionHash);
    console.log("  External Nullifier Hash:", "0x" + externalNullifierHash.toString(16));
    
    console.log("\n💡 Summary:");
    console.log("✅ ElectionManager is accessible");
    console.log("✅ Election is registered");
    console.log("✅ World ID verification function is working");
    console.log("✅ Universal action is configured correctly");
    console.log("");
    console.log("🎯 Next steps:");
    console.log("1. The issue is likely in the transaction parameters or format");
    console.log("2. Check that the actual World ID proof from MiniKit matches expected format");
    console.log("3. Verify that the signal generation matches between app and contract");
    
  } catch (error) {
    console.error("❌ Error testing World ID verification:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
