const { ethers } = require("hardhat");

async function main() {
  console.log("🗳️ Creating test election...");

  // Get the deployed ElectionManager address
  const ELECTION_MANAGER_ADDRESS = "0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC";
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get ElectionManager contract
  const ElectionManager = await ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(ELECTION_MANAGER_ADDRESS);

  // Check if deployer has ELECTION_CREATOR_ROLE
  const ELECTION_CREATOR_ROLE = await electionManager.ELECTION_CREATOR_ROLE();
  const DEFAULT_ADMIN_ROLE = await electionManager.DEFAULT_ADMIN_ROLE();

  const hasCreatorRole = await electionManager.hasRole(ELECTION_CREATOR_ROLE, deployer.address);
  const hasAdminRole = await electionManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);

  console.log("Account roles:");
  console.log("- ELECTION_CREATOR_ROLE:", hasCreatorRole);
  console.log("- DEFAULT_ADMIN_ROLE:", hasAdminRole);

  if (!hasCreatorRole) {
    console.log("❌ Account does not have ELECTION_CREATOR_ROLE");

    if (hasAdminRole) {
      console.log("Granting ELECTION_CREATOR_ROLE to deployer...");
      const tx = await electionManager.grantRole(ELECTION_CREATOR_ROLE, deployer.address);
      await tx.wait();
      console.log("✅ ELECTION_CREATOR_ROLE granted");
    } else {
      console.log("❌ Account does not have DEFAULT_ADMIN_ROLE either");
      console.log("Cannot grant ELECTION_CREATOR_ROLE");
      return;
    }
  }

  // Define test candidates
  const candidates = [
    {
      name: "Alice Johnson",
      description: "Community leader with 10 years of experience in local governance"
    },
    {
      name: "Bob Smith", 
      description: "Tech entrepreneur focused on digital innovation"
    },
    {
      name: "Carol Davis",
      description: "Environmental advocate and sustainability expert"
    },
    {
      name: "David Wilson",
      description: "Education reformer and former school principal"
    }
  ];

  // Create election with unique World ID action
  const timestamp = Math.floor(Date.now() / 1000);
  const uniqueAction = `test-election-${timestamp}`;

  console.log("Creating election with candidates:", candidates.map(c => c.name));
  console.log("World ID Action:", uniqueAction);

  try {
    const createTx = await electionManager.createElection(
      "Test Election 2025",
      "A test election for the World Mini App voting system",
      uniqueAction, // Unique World ID action
      candidates
    );

  console.log("Transaction sent:", createTx.hash);
  const receipt = await createTx.wait();
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

  // Get the created election details
  const electionCount = await electionManager.electionCount();
  console.log("Total elections:", electionCount.toString());

  // Get the latest election
  const latestElection = await electionManager.getElection(electionCount);
  console.log("\n🎉 Election created successfully!");
  console.log("Election ID:", latestElection.id.toString());
  console.log("Title:", latestElection.title);
  console.log("Description:", latestElection.description);
  console.log("World ID Action:", latestElection.worldIdAction);
  console.log("Election Contract Address:", latestElection.electionAddress);
  console.log("Creator:", latestElection.creator);

  // Get candidate count from the Election contract
  const Election = await ethers.getContractFactory("Election");
  const election = Election.attach(latestElection.electionAddress);
  const candidateCount = await election.candidateCount();
  console.log("Candidate Count:", candidateCount.toString());

  // List all candidates
  console.log("\n📋 Candidates:");
  for (let i = 1; i <= candidateCount; i++) {
    const candidate = await election.candidates(i);
    console.log(`${i}. ${candidate.name} - ${candidate.description}`);
  }

  console.log("\n🔗 Update your app configuration:");
  console.log("Election Address:", latestElection.electionAddress);
  console.log("World ID Action:", latestElection.worldIdAction);

  } catch (error) {
    console.error("❌ Failed to create election:");
    console.error(error.message);

    // Try to get more details about the error
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
