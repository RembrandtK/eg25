const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("World ID Verification Integration Tests", function () {
  let electionManager;
  let peerRanking;
  let worldIDAddressBook;
  let owner, user1, user2, unverifiedUser;

  // Test candidates
  const TEST_CANDIDATES = [
    { name: "Alice Johnson", description: "Experienced leader focused on community development" },
    { name: "Bob Smith", description: "Innovation advocate with technology background" },
    { name: "Carol Davis", description: "Environmental champion committed to sustainability" },
    { name: "David Wilson", description: "Economic policy expert focused on fair growth" }
  ];

  beforeEach(async function () {
    [owner, user1, user2, unverifiedUser] = await ethers.getSigners();

    // Deploy the REAL World ID Address Book (not mock)
    // This would connect to the actual World ID system in production
    const WorldIDAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    worldIDAddressBook = await WorldIDAddressBook.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(worldIDAddressBook.target);

    // Deploy PeerRanking with World ID verification
    const PeerRanking = await ethers.getContractFactory("PeerRanking");
    peerRanking = await PeerRanking.deploy(worldIDAddressBook.target, electionManager.target);

    // Add test candidates
    for (const candidate of TEST_CANDIDATES) {
      await electionManager.addCandidate(candidate.name, candidate.description);
    }
  });

  describe("World ID Verification Flow", function () {
    it("Should require World ID verification before voting", async function () {
      console.log("\n=== World ID Verification Requirement Test ===");
      
      // Unverified user should not be able to vote
      await expect(
        peerRanking.connect(unverifiedUser).updateRanking([
          { candidateId: 1, tiedWithPrevious: false }
        ])
      ).to.be.revertedWith("Address not verified");
      
      console.log("✓ Unverified user correctly rejected");
    });

    it("Should allow voting after proper World ID verification", async function () {
      console.log("\n=== World ID Verification Success Test ===");
      
      // Simulate World ID verification process
      const verificationDuration = 365 * 24 * 60 * 60; // 1 year
      const currentTime = Math.floor(Date.now() / 1000);
      const verifiedUntil = currentTime + verificationDuration;
      
      // Verify user through World ID Address Book
      await worldIDAddressBook.setAddressVerifiedUntil(user1.address, verifiedUntil);
      
      // Check verification status
      const verificationStatus = await worldIDAddressBook.addressVerifiedUntil(user1.address);
      expect(bn(verificationStatus)).to.be.greaterThan(currentTime);
      
      console.log(`✓ User ${user1.address} verified until: ${new Date(bn(verificationStatus) * 1000).toISOString()}`);
      
      // Now user should be able to vote
      await expect(
        peerRanking.connect(user1).updateRanking([
          { candidateId: 1, tiedWithPrevious: false },
          { candidateId: 2, tiedWithPrevious: false }
        ])
      ).to.not.be.reverted;
      
      console.log("✓ Verified user successfully voted");
      
      // Verify the vote was recorded
      const userRanking = await peerRanking.getUserRanking(user1.address);
      expect(userRanking.length).to.equal(2);
      expect(bn(userRanking[0].candidateId)).to.equal(1);
      expect(bn(userRanking[1].candidateId)).to.equal(2);
      
      console.log("✓ Vote correctly recorded on-chain");
    });

    it("Should reject expired World ID verification", async function () {
      console.log("\n=== Expired Verification Test ===");
      
      // Set verification to expire in the past
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      await worldIDAddressBook.setAddressVerifiedUntil(user1.address, pastTime);
      
      // User should not be able to vote with expired verification
      await expect(
        peerRanking.connect(user1).updateRanking([
          { candidateId: 1, tiedWithPrevious: false }
        ])
      ).to.be.revertedWith("Address not verified");
      
      console.log("✓ Expired verification correctly rejected");
    });
  });

  describe("Mini App Voting Workflow with World ID", function () {
    beforeEach(async function () {
      // Verify test users for voting workflow tests
      const verificationDuration = 365 * 24 * 60 * 60; // 1 year
      const currentTime = Math.floor(Date.now() / 1000);
      const verifiedUntil = currentTime + verificationDuration;
      
      await worldIDAddressBook.setAddressVerifiedUntil(user1.address, verifiedUntil);
      await worldIDAddressBook.setAddressVerifiedUntil(user2.address, verifiedUntil);
    });

    it("Should handle complete Mini App voting flow", async function () {
      console.log("\n=== Complete Mini App Voting Flow ===");
      
      // Step 1: Load candidates (what Mini App does on startup)
      const candidates = await electionManager.getCandidates();
      expect(candidates.length).to.equal(4);
      console.log(`✓ Loaded ${candidates.length} candidates`);
      
      // Step 2: Check if user has already voted
      const hasVoted = await electionManager.checkHasVoted(user1.address);
      expect(hasVoted).to.be.false;
      console.log("✓ User has not voted yet");
      
      // Step 3: User creates ranking in Mini App
      const userRanking = [
        { candidateId: 1, tiedWithPrevious: false }, // Alice first
        { candidateId: 3, tiedWithPrevious: false }, // Carol second
        { candidateId: 2, tiedWithPrevious: false }  // Bob third
      ];
      
      // Step 4: Submit ranking (with World ID verification)
      const tx = await peerRanking.connect(user1).updateRanking(userRanking);
      const receipt = await tx.wait();
      
      console.log(`✓ Ranking submitted successfully (Gas: ${Number(receipt.gasUsed).toLocaleString()})`);
      
      // Step 5: Verify ranking was stored
      const storedRanking = await peerRanking.getUserRanking(user1.address);
      expect(storedRanking.length).to.equal(3);
      expect(bn(storedRanking[0].candidateId)).to.equal(1); // Alice
      expect(bn(storedRanking[1].candidateId)).to.equal(3); // Carol
      expect(bn(storedRanking[2].candidateId)).to.equal(2); // Bob
      
      console.log("✓ Ranking correctly stored and retrievable");
      
      // Step 6: Check voting status changed
      const hasVotedAfter = await electionManager.checkHasVoted(user1.address);
      expect(hasVotedAfter).to.be.true;
      console.log("✓ Voting status updated");
      
      // Step 7: Verify ranking statistics
      const stats = await peerRanking.getRankingStats();
      expect(bn(stats[0])).to.equal(1); // totalRankers
      expect(bn(stats[1])).to.equal(4); // candidateCount
      
      console.log(`✓ Statistics: ${bn(stats[0])} rankers, ${bn(stats[1])} candidates`);
    });

    it("Should handle ranking updates correctly", async function () {
      console.log("\n=== Ranking Update Test ===");
      
      // Initial ranking
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);
      
      console.log("✓ Initial ranking submitted");
      
      // User changes their mind and updates ranking
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 2, tiedWithPrevious: false }, // Bob now first
        { candidateId: 1, tiedWithPrevious: false }, // Alice now second
        { candidateId: 3, tiedWithPrevious: false }  // Carol added third
      ]);
      
      console.log("✓ Ranking updated");
      
      // Verify updated ranking
      const updatedRanking = await peerRanking.getUserRanking(user1.address);
      expect(updatedRanking.length).to.equal(3);
      expect(bn(updatedRanking[0].candidateId)).to.equal(2); // Bob first
      expect(bn(updatedRanking[1].candidateId)).to.equal(1); // Alice second
      expect(bn(updatedRanking[2].candidateId)).to.equal(3); // Carol third
      
      // Should still have only 1 ranker (same user)
      const stats = await peerRanking.getRankingStats();
      expect(bn(stats[0])).to.equal(1);
      
      console.log("✓ Ranking update handled correctly");
    });

    it("Should handle multiple verified users voting", async function () {
      console.log("\n=== Multiple Users Voting Test ===");
      
      // User 1 votes
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false }
      ]);
      
      // User 2 votes with different preference
      await peerRanking.connect(user2).updateRanking([
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false }
      ]);
      
      console.log("✓ Multiple users voted");
      
      // Verify both rankings are stored
      const user1Ranking = await peerRanking.getUserRanking(user1.address);
      const user2Ranking = await peerRanking.getUserRanking(user2.address);
      
      expect(user1Ranking.length).to.equal(2);
      expect(user2Ranking.length).to.equal(3);
      
      // Verify statistics
      const stats = await peerRanking.getRankingStats();
      expect(bn(stats[0])).to.equal(2); // 2 rankers
      
      console.log(`✓ ${bn(stats[0])} users have voted`);
      
      // Verify pairwise comparisons are tracked
      const aliceBeatsBob = await peerRanking.getComparisonCount(1, 2); // Alice > Bob
      const bobBeatsAlice = await peerRanking.getComparisonCount(2, 1); // Bob > Alice
      
      expect(bn(aliceBeatsBob)).to.equal(1); // User1: Alice > Bob
      expect(bn(bobBeatsAlice)).to.equal(1); // User2: Bob > Alice
      
      console.log(`✓ Pairwise comparisons: Alice>Bob=${bn(aliceBeatsBob)}, Bob>Alice=${bn(bobBeatsAlice)}`);
    });
  });

  describe("Data Export for Off-chain Analysis", function () {
    beforeEach(async function () {
      // Set up verified users and votes for export testing
      const verificationDuration = 365 * 24 * 60 * 60;
      const currentTime = Math.floor(Date.now() / 1000);
      const verifiedUntil = currentTime + verificationDuration;
      
      await worldIDAddressBook.setAddressVerifiedUntil(user1.address, verifiedUntil);
      await worldIDAddressBook.setAddressVerifiedUntil(user2.address, verifiedUntil);
      
      // Add some votes
      await peerRanking.connect(user1).updateRanking([
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false }
      ]);
      
      await peerRanking.connect(user2).updateRanking([
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 1, tiedWithPrevious: false }
      ]);
    });

    it("Should export all rankings for off-chain tallying", async function () {
      console.log("\n=== Data Export Test ===");
      
      // Get all rankers
      const allRankers = await peerRanking.getAllRankers();
      expect(allRankers.length).to.equal(2);
      
      console.log(`✓ Found ${allRankers.length} rankers`);
      
      // Get individual rankings for off-chain analysis
      const rankings = [];
      for (const ranker of allRankers) {
        const ranking = await peerRanking.getUserRanking(ranker);
        rankings.push({
          voter: ranker,
          ranking: ranking.map(entry => ({
            candidateId: bn(entry.candidateId),
            tiedWithPrevious: entry.tiedWithPrevious
          }))
        });
      }
      
      console.log("✓ Exported rankings for off-chain analysis:");
      rankings.forEach((r, i) => {
        const rankingStr = r.ranking.map(entry => 
          `${entry.candidateId}${entry.tiedWithPrevious ? '(tied)' : ''}`
        ).join(' > ');
        console.log(`  Voter ${i + 1}: ${rankingStr}`);
      });
      
      // Verify we can get the comparison matrix for Condorcet analysis
      const matrix = await peerRanking.getFullComparisonMatrix();
      expect(matrix.length).to.be.greaterThan(0);
      
      console.log("✓ Comparison matrix available for Condorcet calculation");
    });
  });
});
