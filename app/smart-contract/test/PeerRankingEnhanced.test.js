const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("PeerRanking Enhanced Features", function () {
  let peerRanking;
  let electionManager;
  let mockAddressBook;
  let owner, voter1, voter2, voter3, voter4, voter5;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();

    // Deploy mock address book
    const MockAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    mockAddressBook = await MockAddressBook.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockAddressBook.target);

    // Deploy PeerRanking
    const PeerRanking = await ethers.getContractFactory("PeerRanking");
    peerRanking = await PeerRanking.deploy(mockAddressBook.target, electionManager.target);

    // Verify test addresses
    const verificationDuration = 365 * 24 * 60 * 60; // 1 year
    const currentTime = Math.floor(Date.now() / 1000);
    const verifiedUntil = currentTime + verificationDuration;

    await mockAddressBook.setAddressVerifiedUntil(voter1.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter2.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter3.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter4.address, verifiedUntil);
    await mockAddressBook.setAddressVerifiedUntil(voter5.address, verifiedUntil);

    // Add test candidates
    await electionManager.addCandidate("Alice Johnson", "Leader");
    await electionManager.addCandidate("Bob Smith", "Innovator");
    await electionManager.addCandidate("Carol Davis", "Environmentalist");
    await electionManager.addCandidate("David Wilson", "Economist");
  });

  describe("Enhanced View Functions", function () {
    beforeEach(async function () {
      // Set up some rankings for testing
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]); // Alice > Bob > Carol > David
      await peerRanking.connect(voter2).updateRanking([2, 1, 4, 3]); // Bob > Alice > David > Carol
      await peerRanking.connect(voter3).updateRanking([1, 3, 2, 4]); // Alice > Carol > Bob > David
    });

    it("Should return full comparison matrix", async function () {
      const matrix = await peerRanking.getFullComparisonMatrix();
      
      // Check matrix dimensions (5x5 because candidates are 1-indexed)
      expect(matrix.length).to.equal(5);
      expect(matrix[0].length).to.equal(5);
      
      // Let's check what the actual values are and adjust expectations
      console.log(`Matrix[1][2] (Alice > Bob): ${bn(matrix[1][2])}`);
      console.log(`Matrix[2][1] (Bob > Alice): ${bn(matrix[2][1])}`);
      console.log(`Matrix[1][3] (Alice > Carol): ${bn(matrix[1][3])}`);
      console.log(`Matrix[3][1] (Carol > Alice): ${bn(matrix[3][1])}`);

      // Alice (1) vs Bob (2): Check actual values
      // voter1: [1,2,3,4] → Alice > Bob
      // voter2: [2,1,4,3] → Bob > Alice
      // voter3: [1,3,2,4] → Alice > Bob
      expect(bn(matrix[1][2])).to.equal(2); // Alice > Bob (voter1, voter3)
      expect(bn(matrix[2][1])).to.equal(1); // Bob > Alice (voter2)

      // Alice (1) vs Carol (3):
      // voter1: [1,2,3,4] → Alice > Carol
      // voter2: [2,1,4,3] → Alice > Carol (Alice is 2nd, Carol is 4th)
      // voter3: [1,3,2,4] → Alice > Carol
      expect(bn(matrix[1][3])).to.equal(3); // Alice > Carol (all three voters)
      expect(bn(matrix[3][1])).to.equal(0); // Carol > Alice (none)
    });

    it("Should return ranking statistics", async function () {
      const [totalRankers, totalComparisons, candidateCount] = await peerRanking.getRankingStats();
      
      expect(bn(totalRankers)).to.equal(3);
      expect(bn(candidateCount)).to.equal(4);
      expect(bn(totalComparisons)).to.be.greaterThan(0);
    });

    it("Should return all rankers", async function () {
      const rankers = await peerRanking.getAllRankers();
      
      expect(rankers.length).to.equal(3);
      expect(rankers).to.include(voter1.address);
      expect(rankers).to.include(voter2.address);
      expect(rankers).to.include(voter3.address);
    });

    it("Should calculate candidate win counts", async function () {
      const aliceWins = await peerRanking.getCandidateWinCount(1);
      const bobWins = await peerRanking.getCandidateWinCount(2);
      
      // Alice should beat most candidates
      expect(bn(aliceWins)).to.be.greaterThan(0);
      
      // Bob should have some wins too
      expect(bn(bobWins)).to.be.greaterThan(0);
    });
  });

  describe("Condorcet Winner Detection", function () {
    it("Should detect clear Condorcet winner", async function () {
      // Create scenario where Alice clearly wins
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]); // Alice first
      await peerRanking.connect(voter2).updateRanking([1, 3, 2, 4]); // Alice first
      await peerRanking.connect(voter3).updateRanking([1, 4, 2, 3]); // Alice first
      
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      
      expect(hasWinner).to.be.true;
      expect(bn(winner)).to.equal(1); // Alice
    });

    it("Should detect when no Condorcet winner exists", async function () {
      // Create a cycle: A > B > C > A
      await peerRanking.connect(voter1).updateRanking([1, 2, 3]); // Alice > Bob > Carol
      await peerRanking.connect(voter2).updateRanking([2, 3, 1]); // Bob > Carol > Alice
      await peerRanking.connect(voter3).updateRanking([3, 1, 2]); // Carol > Alice > Bob
      
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      
      expect(hasWinner).to.be.false;
      expect(bn(winner)).to.equal(0);
    });

    it("Should handle ties in Condorcet calculation", async function () {
      // Create exact ties
      await peerRanking.connect(voter1).updateRanking([1, 2]); // Alice > Bob
      await peerRanking.connect(voter2).updateRanking([2, 1]); // Bob > Alice
      
      const [winner, hasWinner] = await peerRanking.getCondorcetWinner();
      
      expect(hasWinner).to.be.false;
      expect(bn(winner)).to.equal(0);
    });
  });

  describe("Stress Testing", function () {
    it("Should handle many voters efficiently", async function () {
      // Add more voters
      const voters = [voter1, voter2, voter3, voter4, voter5];
      const rankings = [
        [1, 2, 3, 4],
        [2, 1, 4, 3],
        [3, 4, 1, 2],
        [4, 3, 2, 1],
        [1, 3, 4, 2]
      ];
      
      // Submit all rankings
      for (let i = 0; i < voters.length; i++) {
        const tx = await peerRanking.connect(voters[i]).updateRanking(rankings[i]);
        const receipt = await tx.wait();
        
        console.log(`Voter ${i + 1} gas used: ${receipt.gasUsed.toString()}`);
        expect(Number(receipt.gasUsed)).to.be.lessThan(600000);
      }
      
      // Verify all data is consistent
      const [totalRankers, totalComparisons, candidateCount] = await peerRanking.getRankingStats();
      expect(bn(totalRankers)).to.equal(5);
      expect(bn(candidateCount)).to.equal(4);
      expect(bn(totalComparisons)).to.be.greaterThan(0);
    });

    it("Should handle ranking updates efficiently", async function () {
      // Initial ranking
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]);
      
      // Multiple updates
      const updates = [
        [4, 3, 2, 1],
        [2, 1, 4, 3],
        [3, 4, 1, 2],
        [1, 3, 2, 4]
      ];
      
      for (let i = 0; i < updates.length; i++) {
        const tx = await peerRanking.connect(voter1).updateRanking(updates[i]);
        const receipt = await tx.wait();
        
        console.log(`Update ${i + 1} gas used: ${receipt.gasUsed.toString()}`);
        expect(Number(receipt.gasUsed)).to.be.lessThan(400000);
      }
      
      // Should still have only 1 ranker
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle empty election gracefully", async function () {
      // Deploy fresh contracts with no candidates
      const freshElection = await ethers.getContractFactory("ElectionManager");
      const freshElectionInstance = await freshElection.deploy(mockAddressBook.target);
      
      const freshPeerRanking = await ethers.getContractFactory("PeerRanking");
      const freshPeerRankingInstance = await freshPeerRanking.deploy(
        mockAddressBook.target, 
        freshElectionInstance.target
      );
      
      const [winner, hasWinner] = await freshPeerRankingInstance.getCondorcetWinner();
      expect(hasWinner).to.be.false;
      expect(bn(winner)).to.equal(0);
    });

    it("Should validate candidate IDs in win count function", async function () {
      await expect(
        peerRanking.getCandidateWinCount(0)
      ).to.be.revertedWith("Invalid candidate ID");
      
      await expect(
        peerRanking.getCandidateWinCount(999)
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("Should handle single candidate scenarios", async function () {
      // Deploy with only one candidate
      const singleElection = await ethers.getContractFactory("ElectionManager");
      const singleElectionInstance = await singleElection.deploy(mockAddressBook.target);
      await singleElectionInstance.addCandidate("Only Alice", "The only choice");
      
      const singlePeerRanking = await ethers.getContractFactory("PeerRanking");
      const singlePeerRankingInstance = await singlePeerRanking.deploy(
        mockAddressBook.target, 
        singleElectionInstance.target
      );
      
      await singlePeerRankingInstance.connect(voter1).updateRanking([1]);
      
      const [winner, hasWinner] = await singlePeerRankingInstance.getCondorcetWinner();
      expect(hasWinner).to.be.true;
      expect(bn(winner)).to.equal(1);
    });
  });
});
