const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🗳️ Creating test election...");

  // Get the deployed contract address from Ignition deployment files
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;

  const deploymentPath = path.join(__dirname, "..", "ignition", "deployments", `chain-${chainId}`, "deployed_addresses.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for network ${network} (chain ${chainId}). Please deploy contracts first.`);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const ELECTION_MANAGER_ADDRESS = deployedAddresses["ElectionDeployment#ElectionManager"];

  if (!ELECTION_MANAGER_ADDRESS) {
    throw new Error(`ElectionManager not found in deployment for network ${network}`);
  }
  
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

  // Check for existing elections to avoid duplicates
  console.log("🔍 Checking for existing elections...");
  const allElections = await electionManager.getAllElections();
  console.log(`Found ${allElections.length} existing elections`);

  const electionTitle = "City Council Election 2025";
  const electionDescription = "Municipal election for city council representatives";

  // Check if an election with this title already exists
  const existingElection = allElections.find(election =>
    election.title === electionTitle && election.active
  );

  if (existingElection) {
    console.log("❌ An active election with this title already exists:");
    console.log(`   ID: ${existingElection.id}`);
    console.log(`   Title: ${existingElection.title}`);
    console.log(`   World ID Action: ${existingElection.worldIdAction}`);
    console.log(`   Election Address: ${existingElection.electionAddress}`);
    console.log("\n💡 Use a different title or deactivate the existing election first.");
    return;
  }

  // Define test candidates - DIFFERENT from the first election
  const candidates = [
    {
      name: "Emma Rodriguez",
      description: "Healthcare advocate with focus on accessible medical services"
    },
    {
      name: "Michael Chen",
      description: "Urban planning expert specializing in smart city development"
    },
    {
      name: "Sarah Thompson",
      description: "Social justice lawyer and community organizer"
    },
    {
      name: "James Park",
      description: "Renewable energy engineer and climate policy advisor"
    },
    {
      name: "Lisa Martinez",
      description: "Small business owner and economic development specialist"
    }
  ];

  // Create election with unique World ID action
  const timestamp = Math.floor(Date.now() / 1000);
  const uniqueAction = `test-election-${timestamp}`;

  console.log("✅ No duplicate found. Creating new election...");
  console.log("Creating election with candidates:", candidates.map(c => c.name));
  console.log("World ID Action:", uniqueAction);

  try {
    const createTx = await electionManager.createElection(
      electionTitle,
      electionDescription,
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
