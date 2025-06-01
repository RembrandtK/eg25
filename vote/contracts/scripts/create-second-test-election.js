const { ethers } = require("hardhat");

async function main() {
  console.log("🗳️  Creating second test election...");

  // Get the deployed ElectionManager contract
  const electionManagerAddress = "0xE633498333Cc9079340EAE0864D001336211d111";
  const ElectionManager = await ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(electionManagerAddress);

  // Define election details
  const title = "City Council Election 2024";
  const description = "Vote for your preferred city council representatives. This election will determine the leadership for the next 4 years.";
  
  // Define candidates with different names
  const candidates = [
    {
      name: "Emma Thompson",
      description: "Environmental advocate with 10 years of community organizing experience"
    },
    {
      name: "Michael Rodriguez", 
      description: "Small business owner focused on economic development and job creation"
    },
    {
      name: "Sarah Chen",
      description: "Former teacher advocating for education reform and youth programs"
    },
    {
      name: "James Wilson",
      description: "Urban planner specializing in sustainable infrastructure and transportation"
    },
    {
      name: "Lisa Martinez",
      description: "Healthcare worker promoting accessible healthcare and social services"
    }
  ];

  console.log(`📋 Creating election: "${title}"`);
  console.log(`📝 Description: ${description}`);
  console.log(`👥 Candidates: ${candidates.length}`);
  candidates.forEach((candidate, index) => {
    console.log(`   ${index + 1}. ${candidate.name} - ${candidate.description}`);
  });

  try {
    // Create the election
    const tx = await electionManager.createElection(title, description, candidates);
    console.log("⏳ Transaction submitted, waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log(`📄 Transaction hash: ${receipt.hash}`);

    // Get the election ID from the event
    const electionCreatedEvent = receipt.logs.find(
      log => log.fragment && log.fragment.name === 'ElectionCreated'
    );

    if (electionCreatedEvent) {
      const electionId = electionCreatedEvent.args[0];
      const electionAddress = electionCreatedEvent.args[3];
      
      console.log(`🎯 Election ID: ${electionId}`);
      console.log(`📍 Election Contract: ${electionAddress}`);
      console.log(`🏛️  ElectionManager: ${electionManagerAddress}`);
      
      console.log("\n🎉 Second test election created successfully!");
      console.log("📱 You can now vote in this election using the World App");
    } else {
      console.log("⚠️  Election created but couldn't find event details");
    }

  } catch (error) {
    console.error("❌ Error creating election:", error.message);
    if (error.reason) {
      console.error("💡 Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
