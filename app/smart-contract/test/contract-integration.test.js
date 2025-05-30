const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Contract Integration Tests", function () {
  let electionManager;
  let mockAddressBook;
  let owner;
  let testVoter;

  beforeEach(async function () {
    [owner, testVoter] = await ethers.getSigners();

    // Deploy mock address book
    const MockAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    mockAddressBook = await MockAddressBook.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockAddressBook.target);

    // Verify test voter
    const verificationDuration = 365 * 24 * 60 * 60; // 1 year
    const currentTime = Math.floor(Date.now() / 1000);
    const verifiedUntil = currentTime + verificationDuration;
    await mockAddressBook.setAddressVerifiedUntil(testVoter.address, verifiedUntil);

    // Add initial candidates (same as deployment script)
    const candidates = [
      { name: "Alice Johnson", description: "Experienced leader focused on community development and transparency" },
      { name: "Bob Smith", description: "Innovation advocate with a background in technology and education" },
      { name: "Carol Davis", description: "Environmental champion committed to sustainable policies" },
      { name: "David Wilson", description: "Economic policy expert with focus on fair growth and opportunity" }
    ];

    for (const candidate of candidates) {
      await electionManager.addCandidate(candidate.name, candidate.description);
    }
  });

  describe("Frontend Contract Interactions", function () {
    it("Should simulate getCandidates call from frontend", async function () {
      // This simulates what the CandidateList component does
      const candidates = await electionManager.getCandidates();
      
      expect(candidates.length).to.equal(4);
      expect(candidates[0].name).to.equal("Alice Johnson");
      expect(candidates[1].name).to.equal("Bob Smith");
      expect(candidates[2].name).to.equal("Carol Davis");
      expect(candidates[3].name).to.equal("David Wilson");
      
      // Verify all candidates are active
      candidates.forEach(candidate => {
        expect(candidate.active).to.be.true;
      });
    });

    it("Should simulate vote submission from frontend", async function () {
      // This simulates what the VoteButton component does
      const rankedCandidateIds = [2, 1, 4, 3]; // Bob, Alice, David, Carol
      
      // Check voting status before
      expect(await electionManager.checkHasVoted(testVoter.address)).to.be.false;
      
      // Submit vote
      const tx = await electionManager.connect(testVoter).vote(rankedCandidateIds);
      const receipt = await tx.wait();
      
      // Verify transaction succeeded
      expect(receipt.status).to.equal(1);
      
      // Check voting status after
      expect(await electionManager.checkHasVoted(testVoter.address)).to.be.true;
      
      // Verify vote was stored correctly
      const storedVote = await electionManager.getVote(testVoter.address);
      expect(storedVote.map(id => Number(id))).to.deep.equal(rankedCandidateIds);
    });

    it("Should simulate checking if user has voted", async function () {
      // Before voting
      expect(await electionManager.checkHasVoted(testVoter.address)).to.be.false;
      
      // After voting
      await electionManager.connect(testVoter).vote([1, 2, 3, 4]);
      expect(await electionManager.checkHasVoted(testVoter.address)).to.be.true;
    });

    it("Should simulate getting total vote count", async function () {
      expect(await electionManager.getTotalVotes()).to.equal(0);
      
      await electionManager.connect(testVoter).vote([1, 2, 3, 4]);
      expect(await electionManager.getTotalVotes()).to.equal(1);
    });

    it("Should handle partial candidate ranking", async function () {
      // User only ranks top 2 candidates
      const partialRanking = [3, 1]; // Carol, Alice
      
      await electionManager.connect(testVoter).vote(partialRanking);
      
      const storedVote = await electionManager.getVote(testVoter.address);
      expect(storedVote.map(id => Number(id))).to.deep.equal(partialRanking);
    });

    it("Should handle full candidate ranking", async function () {
      // User ranks all candidates
      const fullRanking = [4, 2, 1, 3]; // David, Bob, Alice, Carol
      
      await electionManager.connect(testVoter).vote(fullRanking);
      
      const storedVote = await electionManager.getVote(testVoter.address);
      expect(storedVote.map(id => Number(id))).to.deep.equal(fullRanking);
    });
  });

  describe("Error Scenarios Frontend Should Handle", function () {
    it("Should handle unverified user error", async function () {
      const [, , unverifiedUser] = await ethers.getSigners();
      
      await expect(
        electionManager.connect(unverifiedUser).vote([1, 2, 3])
      ).to.be.revertedWith("Address not verified");
    });

    it("Should handle double voting error", async function () {
      await electionManager.connect(testVoter).vote([1, 2, 3]);
      
      await expect(
        electionManager.connect(testVoter).vote([3, 2, 1])
      ).to.be.revertedWith("You have already voted");
    });

    it("Should handle voting when inactive", async function () {
      await electionManager.toggleVoting(); // Disable voting
      
      await expect(
        electionManager.connect(testVoter).vote([1, 2, 3])
      ).to.be.revertedWith("Voting is not active");
    });

    it("Should handle invalid candidate IDs", async function () {
      await expect(
        electionManager.connect(testVoter).vote([1, 2, 5]) // 5 doesn't exist
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("Should handle empty vote array", async function () {
      await expect(
        electionManager.connect(testVoter).vote([])
      ).to.be.revertedWith("Must vote for at least one candidate");
    });
  });

  describe("Gas Usage Analysis", function () {
    it("Should measure gas for voting with different ranking sizes", async function () {
      const [, voter1, voter2, voter3, voter4] = await ethers.getSigners();
      
      // Verify all voters
      const verificationDuration = 365 * 24 * 60 * 60;
      const currentTime = Math.floor(Date.now() / 1000);
      const verifiedUntil = currentTime + verificationDuration;
      
      await mockAddressBook.setAddressVerifiedUntil(voter1.address, verifiedUntil);
      await mockAddressBook.setAddressVerifiedUntil(voter2.address, verifiedUntil);
      await mockAddressBook.setAddressVerifiedUntil(voter3.address, verifiedUntil);
      await mockAddressBook.setAddressVerifiedUntil(voter4.address, verifiedUntil);

      // Test different ranking sizes
      const rankings = [
        [1],           // Single candidate
        [2, 1],        // Two candidates
        [3, 1, 2],     // Three candidates
        [4, 2, 1, 3]   // All candidates
      ];

      const voters = [voter1, voter2, voter3, voter4];
      
      for (let i = 0; i < rankings.length; i++) {
        const tx = await electionManager.connect(voters[i]).vote(rankings[i]);
        const receipt = await tx.wait();
        
        console.log(`Gas used for ${rankings[i].length} candidate(s): ${receipt.gasUsed.toString()}`);
        
        // Ensure gas usage is reasonable (less than 200k gas)
        expect(Number(receipt.gasUsed)).to.be.lessThan(200000);
      }
    });
  });
});
