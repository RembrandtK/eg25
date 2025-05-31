const { ethers } = require("hardhat");

// Test candidates for development and testing
const TEST_CANDIDATES = [
  {
    name: "Alice Johnson",
    description: "Experienced leader focused on community development and transparency"
  },
  {
    name: "Bob Smith", 
    description: "Innovation advocate with a background in technology and education"
  },
  {
    name: "Carol Davis",
    description: "Environmental champion committed to sustainable policies"
  },
  {
    name: "David Wilson",
    description: "Economic policy expert with focus on fair growth and opportunity"
  }
];

async function main() {
  console.log("🚀 Starting deployment with candidates...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Low balance! You may need more ETH for deployment.");
  }

  try {
    // Step 1: Deploy MockWorldIDAddressBook
    console.log("\n📋 Step 1: Deploying MockWorldIDAddressBook...");
    const MockAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    const mockAddressBook = await MockAddressBook.deploy();
    await mockAddressBook.waitForDeployment();
    
    console.log("✅ MockWorldIDAddressBook deployed to:", await mockAddressBook.getAddress());

    // Step 2: Deploy ElectionManager
    console.log("\n🗳️  Step 2: Deploying ElectionManager...");
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    const electionManager = await ElectionManager.deploy(await mockAddressBook.getAddress());
    await electionManager.waitForDeployment();
    
    console.log("✅ ElectionManager deployed to:", await electionManager.getAddress());

    // Step 3: Deploy PeerRanking
    console.log("\n📊 Step 3: Deploying PeerRanking...");
    const PeerRanking = await ethers.getContractFactory("PeerRanking");
    const peerRanking = await PeerRanking.deploy(
      await mockAddressBook.getAddress(),
      await electionManager.getAddress()
    );
    await peerRanking.waitForDeployment();
    
    console.log("✅ PeerRanking deployed to:", await peerRanking.getAddress());

    // Step 4: Add test candidates
    console.log("\n👥 Step 4: Adding test candidates...");
    
    for (let i = 0; i < TEST_CANDIDATES.length; i++) {
      const candidate = TEST_CANDIDATES[i];
      console.log(`Adding candidate ${i + 1}: ${candidate.name}`);
      
      const tx = await electionManager.addCandidate(candidate.name, candidate.description);
      const receipt = await tx.wait();
      
      console.log(`  ✅ ${candidate.name} added (Gas: ${Number(receipt.gasUsed).toLocaleString()})`);
    }

    // Step 5: Verify deployment
    console.log("\n🔍 Step 5: Verifying deployment...");
    
    // Check voting is active
    const votingActive = await electionManager.votingActive();
    console.log("Voting active:", votingActive);
    
    // Check candidate count
    const candidateCount = await electionManager.candidateCount();
    console.log("Candidate count:", candidateCount.toString());
    
    // List all candidates
    const candidates = await electionManager.getCandidates();
    console.log("\nCandidates:");
    candidates.forEach((candidate, index) => {
      console.log(`  ${index + 1}. ${candidate.name} - ${candidate.description}`);
    });

    // Step 6: Set up test users (for development)
    console.log("\n👤 Step 6: Setting up test users...");
    
    const testUsers = [
      "0x3c6c2348d430996285672346258afb8528086d5a", // Test user 1
      "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7", // Test user 2
      "0x8ba1f109551bD432803012645Hac136c9c0043d7"  // Test user 3
    ];
    
    const verificationDuration = 365 * 24 * 60 * 60; // 1 year
    const currentTime = Math.floor(Date.now() / 1000);
    const verifiedUntil = currentTime + verificationDuration;
    
    for (const userAddress of testUsers) {
      try {
        const tx = await mockAddressBook.setAddressVerifiedUntil(userAddress, verifiedUntil);
        await tx.wait();
        console.log(`  ✅ Verified test user: ${userAddress}`);
      } catch (error) {
        console.log(`  ⚠️  Could not verify ${userAddress}: ${error.message}`);
      }
    }

    // Step 7: Output deployment summary
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Deployment Summary:");
    console.log("=".repeat(50));
    console.log(`MockWorldIDAddressBook: ${await mockAddressBook.getAddress()}`);
    console.log(`ElectionManager:        ${await electionManager.getAddress()}`);
    console.log(`PeerRanking:           ${await peerRanking.getAddress()}`);
    console.log("=".repeat(50));
    console.log(`Candidates added:       ${candidateCount}`);
    console.log(`Test users verified:    ${testUsers.length}`);
    console.log(`Voting active:          ${votingActive}`);
    
    // Step 8: Save deployment info for frontend
    console.log("\n💾 Saving deployment info...");
    
    const deploymentInfo = {
      network: "worldchain-sepolia",
      chainId: 4801,
      timestamp: new Date().toISOString(),
      contracts: {
        MockWorldIDAddressBook: await mockAddressBook.getAddress(),
        ElectionManager: await electionManager.getAddress(),
        PeerRanking: await peerRanking.getAddress()
      },
      candidates: TEST_CANDIDATES,
      testUsers: testUsers,
      deployer: deployer.address
    };
    
    const fs = require("fs");
    const path = require("path");
    
    // Save to both smart contract and frontend directories
    const deploymentPath = path.join(__dirname, "../deployment-info.json");
    const frontendPath = path.join(__dirname, "../../my-app/deployment-info.json");
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentPath}`);
    
    try {
      fs.writeFileSync(frontendPath, JSON.stringify(deploymentInfo, null, 2));
      console.log(`✅ Deployment info saved to: ${frontendPath}`);
    } catch (error) {
      console.log(`⚠️  Could not save to frontend: ${error.message}`);
    }

    console.log("\n🚀 Ready for testing!");
    console.log("Next steps:");
    console.log("1. Run: cd ../my-app && npm run sync-contracts");
    console.log("2. Run: npm run test:fast");
    console.log("3. Start the Mini App: npm run dev");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
