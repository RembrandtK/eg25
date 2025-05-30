const { ethers } = require("hardhat");

async function main() {
  // Get the deployed contract address
  const contractAddress = "0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7";
  
  // Get the contract factory and attach to deployed contract
  const ElectionManager = await ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(contractAddress);
  
  // Define candidates to add
  const candidates = [
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

  console.log("Adding candidates to ElectionManager contract...");
  console.log("Contract address:", contractAddress);
  
  // Check current candidate count
  try {
    const currentCount = await electionManager.candidateCount();
    console.log("Current candidate count:", currentCount.toString());
    
    if (currentCount > 0) {
      console.log("Candidates already exist. Fetching existing candidates...");
      const existingCandidates = await electionManager.getCandidates();
      console.log("Existing candidates:", existingCandidates);
      return;
    }
  } catch (error) {
    console.error("Error checking candidate count:", error);
  }

  // Add each candidate
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    console.log(`Adding candidate ${i + 1}: ${candidate.name}`);
    
    try {
      const tx = await electionManager.addCandidate(candidate.name, candidate.description);
      console.log(`Transaction hash: ${tx.hash}`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`Candidate ${candidate.name} added successfully! Block: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`Error adding candidate ${candidate.name}:`, error);
    }
  }

  // Verify candidates were added
  try {
    const finalCount = await electionManager.candidateCount();
    console.log("Final candidate count:", finalCount.toString());
    
    const allCandidates = await electionManager.getCandidates();
    console.log("All candidates:");
    allCandidates.forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.name} - ${candidate.description}`);
    });
  } catch (error) {
    console.error("Error fetching final candidates:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
