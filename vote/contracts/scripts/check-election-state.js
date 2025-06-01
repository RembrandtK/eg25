const { ethers } = require("hardhat");

async function main() {
  const election = await ethers.getContractAt("Election", "0x9633f291c7173a979E02Abf67Af9817a645C74a4");
  
  console.log("=== Election State Check ===");
  console.log("Candidate count:", await election.candidateCount());
  console.log("Election paused:", await election.paused());
  
  const count = await election.candidateCount();
  for (let i = 1; i <= count; i++) {
    try {
      const candidate = await election.getCandidate(i);
      console.log(`Candidate ${i}: ${candidate.name} - Active: ${candidate.active}`);
    } catch (error) {
      console.log(`Candidate ${i}: ERROR - ${error.message}`);
    }
  }
}

main().catch(console.error);
