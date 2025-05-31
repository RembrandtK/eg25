const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Test-Driven Development for Tideman Method (Ranked-Pair Tallying)
 * 
 * Stages:
 * 1. Read votes from contract
 * 2. Create pairwise tallies
 * 3. Calculate margins and rank pairs
 * 4. Lock pairs (avoiding cycles)
 * 5. Determine final ranking
 */

describe("Tideman Method - Ranked-Pair Tallying", function () {
  let election;
  let mockWorldID;
  let owner, creator, user1, user2, user3, user4;

  // Test candidates: Alice(1), Bob(2), Carol(3), Dave(4)
  const testCandidates = [
    { name: "Alice", description: "Candidate A" },
    { name: "Bob", description: "Candidate B" },
    { name: "Carol", description: "Candidate C" },
    { name: "Dave", description: "Candidate D" }
  ];

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
    [owner, creator, user1, user2, user3, user4] = await ethers.getSigners();

    // Deploy mock World ID
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    mockWorldID = await MockWorldID.deploy();

    // Deploy Election contract
    const Election = await ethers.getContractFactory("Election");
    election = await Election.deploy(
      mockWorldID.target,
      "Tideman Test Election",
      "Testing Tideman ranked-pair method",
      "vote_tideman_test",
      creator.address
    );

    // Add test candidates
    for (const candidate of testCandidates) {
      await election.addCandidate(candidate.name, candidate.description);
    }
  });

  describe("Stage 1: Read Votes from Contract", function () {
    it("should read empty state initially", async function () {
      const totalVoters = await election.getVoteCount();
      const allVoters = await election.getAllVoters();
      const candidates = await election.getCandidates();

      expect(Number(totalVoters)).to.equal(0);
      expect(allVoters.length).to.equal(0);
      expect(candidates.length).to.equal(4);
    });

    it("should read single complete ranking", async function () {
      // Vote: Alice > Bob > Carol > Dave
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false }
      ];
      const proof = getMockWorldIDProof(user1.address, 1001, ranking);
      await election.connect(user1).vote(proof.signal, proof.root, proof.voterId, proof.proof, ranking);

      const vote = await election.getVote(1001);
      expect(vote.length).to.equal(4);
      expect(Number(vote[0].candidateId)).to.equal(1); // Alice first
      expect(Number(vote[1].candidateId)).to.equal(2); // Bob second
      expect(Number(vote[2].candidateId)).to.equal(3); // Carol third
      expect(Number(vote[3].candidateId)).to.equal(4); // Dave fourth
    });

    it("should read partial ranking", async function () {
      // Vote: Carol > Alice (only ranking top 2)
      const ranking = [
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ];
      const proof = getMockWorldIDProof(user1.address, 1002, ranking);
      await election.connect(user1).vote(proof.signal, proof.root, proof.voterId, proof.proof, ranking);

      const vote = await election.getVote(1002);
      expect(vote.length).to.equal(2);
      expect(Number(vote[0].candidateId)).to.equal(3); // Carol first
      expect(Number(vote[1].candidateId)).to.equal(1); // Alice second
    });

    it("should read ranking with ties", async function () {
      // Vote: Alice = Bob > Carol = Dave
      const ranking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice first
        { candidateId: 2, tiedWithPrevious: true },  // Bob tied with Alice
        { candidateId: 3, tiedWithPrevious: false }, // Carol third
        { candidateId: 4, tiedWithPrevious: true }   // Dave tied with Carol
      ];
      const proof = getMockWorldIDProof(user1.address, 1003, ranking);
      await election.connect(user1).vote(proof.signal, proof.root, proof.voterId, proof.proof, ranking);

      const vote = await election.getVote(1003);
      expect(vote.length).to.equal(4);
      expect(vote[0].tiedWithPrevious).to.be.false; // Alice not tied
      expect(vote[1].tiedWithPrevious).to.be.true;  // Bob tied with Alice
      expect(vote[2].tiedWithPrevious).to.be.false; // Carol not tied with previous
      expect(vote[3].tiedWithPrevious).to.be.true;  // Dave tied with Carol
    });
  });

  describe("Stage 2: Create Pairwise Tallies", function () {
    beforeEach(async function () {
      // Set up test votes for pairwise analysis
      // Vote 1: Alice > Bob > Carol > Dave
      const vote1 = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false }
      ];
      const proof1 = getMockWorldIDProof(user1.address, 2001, vote1);
      await election.connect(user1).vote(proof1.signal, proof1.root, proof1.voterId, proof1.proof, vote1);

      // Vote 2: Bob > Carol > Dave > Alice
      const vote2 = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ];
      const proof2 = getMockWorldIDProof(user2.address, 2002, vote2);
      await election.connect(user2).vote(proof2.signal, proof2.root, proof2.voterId, proof2.proof, vote2);

      // Vote 3: Carol > Alice > Dave > Bob
      const vote3 = [
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const proof3 = getMockWorldIDProof(user3.address, 2003, vote3);
      await election.connect(user3).vote(proof3.signal, proof3.root, proof3.voterId, proof3.proof, vote3);
    });

    it("should have correct test data setup", async function () {
      const totalVoters = await election.getVoteCount();
      expect(Number(totalVoters)).to.equal(3);
      
      // Verify each vote is stored correctly
      const vote1 = await election.getVote(2001);
      const vote2 = await election.getVote(2002);
      const vote3 = await election.getVote(2003);
      
      expect(Number(vote1[0].candidateId)).to.equal(1); // Alice first in vote 1
      expect(Number(vote2[0].candidateId)).to.equal(2); // Bob first in vote 2
      expect(Number(vote3[0].candidateId)).to.equal(3); // Carol first in vote 3
    });

    // Note: Actual pairwise tally calculation will be implemented in TidemanCalculator class
    // Expected pairwise results from the 3 votes above:
    // Alice vs Bob: Alice wins 2-1 (votes 1,3 vs vote 2)
    // Alice vs Carol: Carol wins 2-1 (votes 2,3 vs vote 1)
    // Alice vs Dave: Alice wins 2-1 (votes 1,3 vs vote 2)
    // Bob vs Carol: Carol wins 2-1 (votes 2,3 vs vote 1)
    // Bob vs Dave: Bob wins 2-1 (votes 1,2 vs vote 3)
    // Carol vs Dave: Carol wins 3-0 (all votes)
  });

  describe("Stage 3: Handle Ties in Pairwise Tallies", function () {
    it("should handle tied candidates in individual votes", async function () {
      // Vote with tie: Alice = Bob > Carol
      const voteWithTie = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice first
        { candidateId: 2, tiedWithPrevious: true },  // Bob tied with Alice
        { candidateId: 3, tiedWithPrevious: false }  // Carol third
      ];
      const proof = getMockWorldIDProof(user1.address, 3001, voteWithTie);
      await election.connect(user1).vote(proof.signal, proof.root, proof.voterId, proof.proof, voteWithTie);

      const vote = await election.getVote(3001);
      expect(vote.length).to.equal(3);
      expect(vote[1].tiedWithPrevious).to.be.true; // Bob tied with Alice
      
      // In pairwise tallies:
      // - Alice vs Bob: should be 0.5 - 0.5 (tie)
      // - Alice vs Carol: Alice wins 1-0
      // - Bob vs Carol: Bob wins 1-0
    });
  });

  describe("Complete Tideman Algorithm Integration", function () {
    let voteReader;
    let tidemanCalculator;

    beforeEach(async function () {
      // Import the classes
      const { VoteReader } = require("../scripts/vote-reader");
      const { TidemanCalculator } = require("../scripts/tideman-calculator");

      // Set up test votes for a complete Tideman calculation
      // Vote 1: Alice > Bob > Carol > Dave
      const vote1 = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false }
      ];
      const proof1 = getMockWorldIDProof(user1.address, 4001, vote1);
      await election.connect(user1).vote(proof1.signal, proof1.root, proof1.voterId, proof1.proof, vote1);

      // Vote 2: Bob > Carol > Dave > Alice
      const vote2 = [
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ];
      const proof2 = getMockWorldIDProof(user2.address, 4002, vote2);
      await election.connect(user2).vote(proof2.signal, proof2.root, proof2.voterId, proof2.proof, vote2);

      // Vote 3: Carol > Dave > Alice > Bob
      const vote3 = [
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 4, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ];
      const proof3 = getMockWorldIDProof(user3.address, 4003, vote3);
      await election.connect(user3).vote(proof3.signal, proof3.root, proof3.voterId, proof3.proof, vote3);

      // Vote 4: Dave > Alice > Bob > Carol
      const vote4 = [
        { candidateId: 4, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false }
      ];
      const proof4 = getMockWorldIDProof(user4.address, 4004, vote4);
      await election.connect(user4).vote(proof4.signal, proof4.root, proof4.voterId, proof4.proof, vote4);

      // Initialize vote reader and calculator
      voteReader = new VoteReader(election.target, ethers.provider);
      tidemanCalculator = new TidemanCalculator(voteReader);
    });

    it("should complete full Tideman calculation", async function () {
      const result = await tidemanCalculator.calculate();

      // Verify all stages completed
      expect(result.votes).to.exist;
      expect(result.pairwiseTallies).to.exist;
      expect(result.rankedPairs).to.exist;
      expect(result.lockedPairs).to.exist;
      expect(result.finalRanking).to.exist;
      expect(result.winner).to.exist;

      // Verify vote data
      expect(result.votes.votes.length).to.equal(4);
      expect(result.votes.candidates.length).to.equal(4);

      // Verify pairwise tallies exist for all pairs
      const expectedPairs = 4 * 3; // n * (n-1) for 4 candidates
      expect(Object.keys(result.pairwiseTallies).length).to.equal(expectedPairs);

      // Verify final ranking has all candidates
      expect(result.finalRanking.length).to.equal(4);
      expect(result.finalRanking[0].rank).to.equal(1);
      expect(result.finalRanking[3].rank).to.equal(4);

      console.log("🏆 Tideman Winner:", result.winner.name);
      console.log("📊 Final Ranking:", result.finalRanking.map(r => `${r.rank}. ${r.candidate.name}`));
    });

    it("should handle ties in individual votes", async function () {
      // Clear existing votes and add vote with ties
      // This would require redeploying the contract or using a different voter ID
      // For now, we'll test the tie handling logic separately

      const voteWithTies = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice first
        { candidateId: 2, tiedWithPrevious: true },  // Bob tied with Alice
        { candidateId: 3, tiedWithPrevious: false }  // Carol third
      ];

      // Test the tie grouping logic directly
      const groups = tidemanCalculator._groupByRank(voteWithTies);
      expect(groups.length).to.equal(2);
      expect(groups[0]).to.deep.equal([1, 2]); // Alice and Bob tied
      expect(groups[1]).to.deep.equal([3]);    // Carol alone
    });
  });
});
