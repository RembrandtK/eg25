const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Test-Driven Development for Ranked-Pair Tallying
 * 
 * Data Processing Stages:
 * 1. Read votes from contract
 * 2. Convert to pairwise tallies
 * 3. Calculate margins and rank pairs
 * 4. Lock pairs (avoiding cycles)
 * 5. Determine final ranking
 */

describe("Ranked-Pair Tallying", function () {
  let election;
  let mockWorldID;
  let owner, creator, user1, user2, user3;

  // Test data structures
  const testCandidates = [
    { name: "Alice", description: "Candidate A" },
    { name: "Bob", description: "Candidate B" },
    { name: "Carol", description: "Candidate C" },
    { name: "Dave", description: "Candidate D" }
  ];

  // Helper function to generate mock World ID proof
  function getMockWorldIDProof(voterAddress, voterId, ranking) {
    const candidateIds = ranking.map(r => r.candidateId);
    const tiedFlags = ranking.map(r => r.tiedWithPrevious);
    const signal = ethers.solidityPackedKeccak256(
      ["uint256[]", "bool[]"],
      [candidateIds, tiedFlags]
    );
    return {
      signal: signal,
      root: 1,
      voterId: voterId,
      proof: [0, 0, 0, 0, 0, 0, 0, 0]
    };
  }

  beforeEach(async function () {
    [owner, creator, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock World ID
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    mockWorldID = await MockWorldID.deploy();

    // Deploy Election contract
    const Election = await ethers.getContractFactory("Election");
    election = await Election.deploy(
      mockWorldID.target,
      "Ranked Pair Test Election",
      "Testing ranked pair tallying",
      "vote_rp_test",
      creator.address
    );

    // Add test candidates
    for (const candidate of testCandidates) {
      await election.addCandidate(candidate.name, candidate.description);
    }
  });

  describe("Stage 1: Reading Votes from Contract", function () {
    it("should read empty votes initially", async function () {
      const totalVoters = await election.getTotalVoters();
      const allVoters = await election.getAllVoters();
      
      expect(Number(totalVoters)).to.equal(0);
      expect(allVoters.length).to.equal(0);
    });

    it("should read single vote correctly", async function () {
      const voterId = 12345;
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice first
        { candidateId: 3, tiedWithPrevious: false }, // Carol second
        { candidateId: 2, tiedWithPrevious: false }, // Bob third
        { candidateId: 4, tiedWithPrevious: false }  // Dave fourth
      ];
      const proof = getMockWorldIDProof(user1.address, voterId, ranking);

      await election.connect(user1).vote(
        proof.signal, proof.root, proof.voterId, proof.proof, ranking
      );

      const vote = await election.getVote(voterId);
      expect(vote.length).to.equal(4);
      expect(Number(vote[0].candidateId)).to.equal(1); // Alice first
      expect(Number(vote[1].candidateId)).to.equal(3); // Carol second
      expect(Number(vote[2].candidateId)).to.equal(2); // Bob third
      expect(Number(vote[3].candidateId)).to.equal(4); // Dave fourth
    });

    it("should read multiple votes correctly", async function () {
      // Vote 1: Alice > Carol > Bob > Dave
      const vote1 = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false }
      ];
      const proof1 = getMockWorldIDProof(user1.address, 12345, vote1);
      await election.connect(user1).vote(proof1.signal, proof1.root, proof1.voterId, proof1.proof, vote1);

      // Vote 2: Bob > Alice > Dave > Carol
      const vote2 = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false }
      ];
      const proof2 = getMockWorldIDProof(user2.address, 67890, vote2);
      await election.connect(user2).vote(proof2.signal, proof2.root, proof2.voterId, proof2.proof, vote2);

      const totalVoters = await election.getTotalVoters();
      const allVoters = await election.getAllVoters();
      
      expect(Number(totalVoters)).to.equal(2);
      expect(allVoters.length).to.equal(2);
      expect(Number(allVoters[0])).to.equal(12345);
      expect(Number(allVoters[1])).to.equal(67890);
    });
  });

  describe("Stage 2: Convert to Pairwise Tallies", function () {
    beforeEach(async function () {
      // Add three test votes for pairwise analysis
      // Vote 1: Alice > Carol > Bob > Dave
      const vote1 = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false }
      ];
      const proof1 = getMockWorldIDProof(user1.address, 12345, vote1);
      await election.connect(user1).vote(proof1.signal, proof1.root, proof1.voterId, proof1.proof, vote1);

      // Vote 2: Bob > Alice > Dave > Carol
      const vote2 = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false }
      ];
      const proof2 = getMockWorldIDProof(user2.address, 67890, vote2);
      await election.connect(user2).vote(proof2.signal, proof2.root, proof2.voterId, proof2.proof, vote2);

      // Vote 3: Carol > Dave > Alice > Bob
      const vote3 = [
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const proof3 = getMockWorldIDProof(user3.address, 11111, vote3);
      await election.connect(user3).vote(proof3.signal, proof3.root, proof3.voterId, proof3.proof, vote3);
    });

    it("should have correct test data setup", async function () {
      const totalVoters = await election.getTotalVoters();
      expect(Number(totalVoters)).to.equal(3);
    });

    // Note: The actual pairwise tally calculation will be implemented in the RankedPairCalculator
    // These tests verify the contract data is ready for processing
  });

  describe("Stage 3: Handle Tied Rankings", function () {
    it("should handle votes with ties correctly", async function () {
      // Vote with ties: Alice = Carol > Bob = Dave
      const voteWithTies = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice first
        { candidateId: 3, tiedWithPrevious: true },  // Carol tied with Alice
        { candidateId: 2, tiedWithPrevious: false }, // Bob third
        { candidateId: 4, tiedWithPrevious: true }   // Dave tied with Bob
      ];
      const proof = getMockWorldIDProof(user1.address, 55555, voteWithTies);
      await election.connect(user1).vote(proof.signal, proof.root, proof.voterId, proof.proof, voteWithTies);

      const vote = await election.getVote(55555);
      expect(vote.length).to.equal(4);
      expect(vote[0].tiedWithPrevious).to.be.false; // Alice not tied (first)
      expect(vote[1].tiedWithPrevious).to.be.true;  // Carol tied with previous (Alice)
      expect(vote[2].tiedWithPrevious).to.be.false; // Bob not tied with previous
      expect(vote[3].tiedWithPrevious).to.be.true;  // Dave tied with previous (Bob)
    });

    it("should reject vote where first candidate is marked as tied", async function () {
      const invalidVote = [
        { candidateId: 1, tiedWithPrevious: true }, // Invalid: first cannot be tied
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const proof = getMockWorldIDProof(user1.address, 99999, invalidVote);

      await expect(
        election.connect(user1).vote(proof.signal, proof.root, proof.voterId, proof.proof, invalidVote)
      ).to.be.revertedWithCustomError(election, "FirstEntryCannotBeTied");
    });
  });

  describe("Stage 4: Vote Data Integrity", function () {
    it("should maintain vote data consistency across updates", async function () {
      const voterId = 12345;
      
      // Initial vote
      const initialVote = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const proof1 = getMockWorldIDProof(user1.address, voterId, initialVote);
      await election.connect(user1).vote(proof1.signal, proof1.root, proof1.voterId, proof1.proof, initialVote);

      // Updated vote
      const updatedVote = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false }
      ];
      const proof2 = getMockWorldIDProof(user1.address, voterId, updatedVote);
      await election.connect(user1).vote(proof2.signal, proof2.root, proof2.voterId, proof2.proof, updatedVote);

      const finalVote = await election.getVote(voterId);
      expect(finalVote.length).to.equal(3);
      expect(Number(finalVote[0].candidateId)).to.equal(2); // Bob first
      expect(Number(finalVote[1].candidateId)).to.equal(1); // Alice second
      expect(Number(finalVote[2].candidateId)).to.equal(3); // Carol third

      // Should still only count as one voter
      const totalVoters = await election.getTotalVoters();
      expect(Number(totalVoters)).to.equal(1);
    });
  });
});
