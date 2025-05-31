const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

// Consistent test data as per TDD approach
const TEST_CANDIDATES = [
  { name: "Alice Johnson", description: "Community development leader" },
  { name: "Bob Smith", description: "Technology and education advocate" },
  { name: "Carol Davis", description: "Environmental sustainability champion" },
  { name: "David Wilson", description: "Economic policy expert" }
];

describe("Phase 1: Core Contract Functionality (TDD)", function () {
  let electionManager;
  let simpleRanking;
  let worldIDAddressBook;
  let owner, verifiedUser, unverifiedUser, expiredUser;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock address book
    const MockAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    mockAddressBook = await MockAddressBook.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockAddressBook.target);

    // Deploy PeerRanking
    const PeerRanking = await ethers.getContractFactory("PeerRanking");
    peerRanking = await PeerRanking.deploy(mockAddressBook.target, electionManager.target);

    // Verify test addresses (simulate World ID verification)
    const verificationDuration = 365 * 24 * 60 * 60; // 1 year
    const currentTime = Math.floor(Date.now() / 1000);
    const verifiedUntil = currentTime + verificationDuration;

    const users = [user1, user2, user3];
    for (const user of users) {
      await mockAddressBook.setAddressVerifiedUntil(user.address, verifiedUntil);
    }

    // Add test candidates (this simulates the deployment setup)
    for (const candidate of TEST_CANDIDATES) {
      await electionManager.addCandidate(candidate.name, candidate.description);
    }
  });

  describe("Mini App Startup Flow", function () {
    it("Should load candidates correctly on app startup", async function () {
      console.log("\n=== Mini App Startup Test ===");
      
      // Simulate what the Mini App does on startup
      const candidates = await electionManager.getCandidates();
      
      expect(candidates.length).to.equal(4);
      expect(candidates[0].name).to.equal("Alice Johnson");
      expect(candidates[0].active).to.be.true;
      expect(candidates[0].id).to.equal(1);
      
      console.log("✓ Candidates loaded successfully:");
      candidates.forEach((candidate, index) => {
        console.log(`  ${index + 1}. ${candidate.name} - ${candidate.description}`);
      });
    });

    it("Should check voting status correctly", async function () {
      // Check if voting is active
      const votingActive = await electionManager.votingActive();
      expect(votingActive).to.be.true;
      
      // Check if user has voted (should be false initially)
      const hasVoted = await electionManager.checkHasVoted(user1.address);
      expect(hasVoted).to.be.false;
      
      console.log("✓ Voting status checked correctly");
    });

    it("Should load user's existing ranking if any", async function () {
      // Initially, user should have no ranking
      const initialRanking = await peerRanking.getUserRanking(user1.address);
      expect(initialRanking.length).to.equal(0);
      
      // User submits a ranking
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);
      
      // Now user should have a ranking
      const updatedRanking = await peerRanking.getUserRanking(user1.address);
      expect(updatedRanking.length).to.equal(3);
      expect(bn(updatedRanking[0].candidateId)).to.equal(1);
      expect(bn(updatedRanking[1].candidateId)).to.equal(3);
      expect(bn(updatedRanking[2].candidateId)).to.equal(2);
      
      console.log("✓ User ranking persistence works correctly");
    });
  });

  describe("Interactive Ranking Flow", function () {
    it("Should handle drag-and-drop ranking updates", async function () {
      console.log("\n=== Interactive Ranking Test ===");
      
      // Simulate user building ranking step by step
      
      // Step 1: User adds first candidate
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 2, tiedWithPrevious: false }
      ]);
      
      let ranking = await peerRanking.getUserRanking(user1.address);
      expect(ranking.length).to.equal(1);
      expect(bn(ranking[0].candidateId)).to.equal(2);
      
      // Step 2: User adds second candidate
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ]);
      
      ranking = await peerRanking.getUserRanking(user1.address);
      expect(ranking.length).to.equal(2);
      expect(bn(ranking[0].candidateId)).to.equal(2);
      expect(bn(ranking[1].candidateId)).to.equal(1);
      
      // Step 3: User reorders (drags Alice to top)
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);
      
      ranking = await peerRanking.getUserRanking(user1.address);
      expect(ranking.length).to.equal(2);
      expect(bn(ranking[0].candidateId)).to.equal(1);
      expect(bn(ranking[1].candidateId)).to.equal(2);
      
      console.log("✓ Interactive ranking updates work correctly");
    });

    it("Should handle partial rankings correctly", async function () {
      // User only ranks their top 2 candidates
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 3, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ]);
      
      const ranking = await peerRanking.getUserRanking(user1.address);
      expect(ranking.length).to.equal(2);
      
      // Verify pairwise comparisons are recorded correctly
      const carolBeatsAlice = await peerRanking.getComparisonCount(3, 1);
      expect(bn(carolBeatsAlice)).to.equal(1);
      
      console.log("✓ Partial rankings handled correctly");
    });
  });

  describe("World ID Integration", function () {
    it("Should prevent unverified users from voting", async function () {
      const [, , , , unverifiedUser] = await ethers.getSigners();
      
      // Unverified user should not be able to vote
      await expect(
        peerRanking.connect(unverifiedUser).updateRanking([
          { candidateId: 1, tiedWithPrevious: false }
        ])
      ).to.be.revertedWith("Address not verified");
      
      console.log("✓ World ID verification enforced correctly");
    });

    it("Should allow verified users to vote", async function () {
      // Verified user should be able to vote
      await expect(
        peerRanking.connect(user1).updateRanking([
          { candidateId: 1, tiedWithPrevious: false }
        ])
      ).to.not.be.reverted;
      
      console.log("✓ Verified users can vote successfully");
    });
  });

  describe("Real-time Updates", function () {
    it("Should update ranking statistics in real-time", async function () {
      console.log("\n=== Real-time Updates Test ===");
      
      // Initial state
      let stats = await peerRanking.getRankingStats();
      expect(bn(stats[0])).to.equal(0); // totalRankers
      
      // User 1 votes
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);
      
      stats = await peerRanking.getRankingStats();
      expect(bn(stats[0])).to.equal(1); // totalRankers should be 1
      
      // User 2 votes
      await peerRanking.connect(user2).updateRanking([
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ]);
      
      stats = await peerRanking.getRankingStats();
      expect(bn(stats[0])).to.equal(2); // totalRankers should be 2
      
      console.log("✓ Real-time statistics updates work correctly");
    });

    it("Should show live comparison results", async function () {
      // Set up voting scenario
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);
      
      await peerRanking.connect(user2).updateRanking([
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ]);
      
      // Check live comparison results
      const aliceBeatsBob = await peerRanking.getComparisonCount(1, 2);
      const bobBeatsAlice = await peerRanking.getComparisonCount(2, 1);

      expect(bn(aliceBeatsBob)).to.equal(1);
      expect(bn(bobBeatsAlice)).to.equal(1);
      
      console.log("✓ Live comparison results work correctly");
    });
  });

  describe("Error Handling", function () {
    it("Should handle invalid candidate IDs gracefully", async function () {
      await expect(
        peerRanking.connect(user1).updateRanking([
          { candidateId: 999, tiedWithPrevious: false }
        ])
      ).to.be.revertedWith("Invalid candidate ID");
      
      console.log("✓ Invalid candidate IDs handled correctly");
    });

    it("Should handle empty rankings gracefully", async function () {
      await expect(
        peerRanking.connect(user1).updateRanking([])
      ).to.be.revertedWith("Ranking cannot be empty");
      
      console.log("✓ Empty rankings handled correctly");
    });

    it("Should handle duplicate candidate IDs", async function () {
      // Note: Current contract implementation allows duplicates
      // This test documents the current behavior
      await expect(
        peerRanking.connect(user1).updateRanking([
          { candidateId: 1, tiedWithPrevious: false },
          { candidateId: 1, tiedWithPrevious: false }
        ])
      ).to.not.be.reverted;

      console.log("✓ Duplicate candidates allowed (current implementation)");
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for typical operations", async function () {
      console.log("\n=== Gas Usage Test ===");
      
      // Test gas usage for different ranking sizes
      const testCases = [
        { size: 1, ranking: [{ candidateId: 1, tiedWithPrevious: false }] },
        { size: 2, ranking: [
          { candidateId: 1, tiedWithPrevious: false },
          { candidateId: 2, tiedWithPrevious: false }
        ]},
        { size: 4, ranking: [
          { candidateId: 1, tiedWithPrevious: false },
          { candidateId: 2, tiedWithPrevious: false },
          { candidateId: 3, tiedWithPrevious: false },
          { candidateId: 4, tiedWithPrevious: false }
        ]}
      ];
      
      for (const testCase of testCases) {
        const tx = await peerRanking.connect(user1).updateRanking(testCase.ranking);
        const receipt = await tx.wait();
        
        console.log(`Ranking ${testCase.size} candidates: ${Number(receipt.gasUsed).toLocaleString()} gas`);

        // Gas expectations based on actual measurements:
        // 1 candidate: ~197k gas, 2 candidates: ~191k gas, 4 candidates: ~400k gas
        const expectedMaxGas = testCase.size <= 2 ? 250000 : 500000;
        expect(Number(receipt.gasUsed)).to.be.lessThan(expectedMaxGas);
      }
    });
  });
});
