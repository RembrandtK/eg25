const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

// Helper function to convert BigInt to Number for comparisons
function bn(value) {
  return Number(value);
}

describe("PeerRanking Contract", function () {
  let peerRanking;
  let electionManager;
  let mockAddressBook;
  let owner, voter1, voter2, voter3, unverifiedUser;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, unverifiedUser] = await ethers.getSigners();

    // Use World ID Router contract from environment
    if (!process.env.WORLD_ID_ROUTER_ADDRESS) {
      throw new Error("WORLD_ID_ROUTER_ADDRESS environment variable is required");
    }
    mockAddressBook = { target: process.env.WORLD_ID_ROUTER_ADDRESS };

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(mockAddressBook.target);

    // Deploy PeerRanking with World ID integration
    const PeerRanking = await ethers.getContractFactory("PeerRanking");

    if (!process.env.WORLD_ID_APP_ID) {
      throw new Error("WORLD_ID_APP_ID environment variable is required");
    }
    if (!process.env.WORLD_ID_ACTION) {
      throw new Error("WORLD_ID_ACTION environment variable is required");
    }

    peerRanking = await PeerRanking.deploy(
      mockAddressBook.target,
      process.env.WORLD_ID_APP_ID,
      process.env.WORLD_ID_ACTION,
      electionManager.target
    );

    // No need for address verification setup - we use ZK proofs now

    // Add test candidates
    await electionManager.addCandidate("Alice Johnson", "Leader");
    await electionManager.addCandidate("Bob Smith", "Innovator");
    await electionManager.addCandidate("Carol Davis", "Environmentalist");
    await electionManager.addCandidate("David Wilson", "Economist");
  });

  describe("Deployment", function () {
    it("Should set the correct contracts", async function () {
      expect(await peerRanking.worldId()).to.equal(mockAddressBook.target);
      expect(await peerRanking.electionManager()).to.equal(electionManager.target);
      expect(await peerRanking.groupId()).to.equal(1); // Orb-verified only
    });

    it("Should have proper external nullifier hash", async function () {
      const externalNullifierHash = await peerRanking.externalNullifierHash();
      expect(externalNullifierHash).to.not.equal(0);
    });

    it("Should start with zero rankers", async function () {
      expect(bn(await peerRanking.getTotalRankers())).to.equal(0);
    });
  });

  describe("World ID Proof Verification", function () {
    it("Should REJECT invalid World ID proofs", async function () {
      // Invalid proof data - this should be rejected by World ID Router
      const signal = voter1.address;
      const root = "123456789"; // Invalid root
      const nullifierHash = "987654321"; // Invalid nullifier
      const invalidProof = [
        "1", "2", "3", "4", "5", "6", "7", "8" // Invalid proof values
      ];

      const ranking = [{ candidateId: 1, tiedWithPrevious: false }];

      // This should revert because World ID Router will reject the invalid proof
      await expect(
        peerRanking.connect(voter1).updateRanking(
          signal,
          root,
          nullifierHash,
          invalidProof,
          ranking
        )
      ).to.be.reverted;

      console.log("✅ Invalid proof correctly rejected by World ID verification");
    });

    it("Should allow verified user to submit ranking with valid World ID proof", async function () {
      // Real World ID proof parameters (these would come from IDKit in production)
      const signal = voter1.address;
      const root = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const nullifierHash = "12345678901234567890123456789012345678901234567890123456789012";
      const proof = [
        "1111111111111111111111111111111111111111111111111111111111111111",
        "2222222222222222222222222222222222222222222222222222222222222222",
        "3333333333333333333333333333333333333333333333333333333333333333",
        "4444444444444444444444444444444444444444444444444444444444444444",
        "5555555555555555555555555555555555555555555555555555555555555555",
        "6666666666666666666666666666666666666666666666666666666666666666",
        "7777777777777777777777777777777777777777777777777777777777777777",
        "8888888888888888888888888888888888888888888888888888888888888888"
      ];

      const ranking = [
        { candidateId: 1, tiedWithPrevious: false },
        { candidateId: 2, tiedWithPrevious: false },
        { candidateId: 3, tiedWithPrevious: false }
      ];

      // This will call real World ID verification
      const tx = await peerRanking.connect(voter1).updateRanking(
        signal,
        root,
        nullifierHash,
        proof,
        ranking
      );
      await tx.wait();

      const storedRanking = await peerRanking.getUserRanking(voter1.address);
      expect(storedRanking.length).to.equal(3);
      expect(Number(storedRanking[0].candidateId)).to.equal(1);
      expect(Number(storedRanking[1].candidateId)).to.equal(2);
      expect(Number(storedRanking[2].candidateId)).to.equal(3);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);
    });

    it("Should allow vote updates but prevent nullifier reuse", async function () {
      const signal = voter1.address;
      const root = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const nullifierHash1 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const nullifierHash2 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const proof = [
        "0x1111111111111111111111111111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222222222222222222222222222",
        "0x3333333333333333333333333333333333333333333333333333333333333333",
        "0x4444444444444444444444444444444444444444444444444444444444444444",
        "0x5555555555555555555555555555555555555555555555555555555555555555",
        "0x6666666666666666666666666666666666666666666666666666666666666666",
        "0x7777777777777777777777777777777777777777777777777777777777777777",
        "0x8888888888888888888888888888888888888888888888888888888888888888"
      ];

      // First vote with nullifier1
      const ranking1 = [{ candidateId: 1, tiedWithPrevious: false }];
      await peerRanking.connect(voter1).updateRanking(signal, root, nullifierHash1, proof, ranking1);

      // Vote update with different nullifier (same human, different vote)
      const ranking2 = [{ candidateId: 2, tiedWithPrevious: false }];
      await peerRanking.connect(voter1).updateRanking(signal, root, nullifierHash2, proof, ranking2);

      // Should still only count as 1 ranker (same human)
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);

      // Trying to reuse nullifier1 should fail
      await expect(
        peerRanking.connect(voter1).updateRanking(signal, root, nullifierHash1, proof, ranking1)
      ).to.be.revertedWithCustomError(peerRanking, "InvalidNullifier");
    });

    it("Should not allow empty ranking", async function () {
      try {
        await peerRanking.connect(voter1).updateRanking([]);
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Ranking cannot be empty");
      }
    });

    it("Should not allow invalid candidate IDs", async function () {
      try {
        await peerRanking.connect(voter1).updateRanking([1, 2, 5]); // 5 doesn't exist
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Invalid candidate ID");
      }

      try {
        await peerRanking.connect(voter1).updateRanking([0, 1, 2]); // 0 is invalid
        expect.fail("Should have reverted");
      } catch (error) {
        expect(error.message).to.include("Invalid candidate ID");
      }
    });
  });

  describe("Pairwise Comparison Logic", function () {
    it("Should generate correct comparisons for simple ranking", async function () {
      // Ranking: Alice > Bob > Carol (1 > 2 > 3)
      const ranking = [1, 2, 3];

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Expected comparisons: Alice>Bob, Alice>Carol, Bob>Carol
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(1); // Alice > Carol
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(1); // Bob > Carol

      // Reverse comparisons should be 0
      expect(bn(await peerRanking.getComparisonCount(2, 1))).to.equal(0); // Bob > Alice
      expect(bn(await peerRanking.getComparisonCount(3, 1))).to.equal(0); // Carol > Alice
      expect(bn(await peerRanking.getComparisonCount(3, 2))).to.equal(0); // Carol > Bob
    });

    it("Should handle single candidate ranking", async function () {
      const ranking = [1]; // Only Alice

      await peerRanking.connect(voter1).updateRanking(ranking);

      // No comparisons should be generated (check a few pairs)
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(0);
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(0);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);
    });

    it("Should accumulate comparisons from multiple users", async function () {
      // Voter1: Alice > Bob > Carol
      await peerRanking.connect(voter1).updateRanking([1, 2, 3]);

      // Voter2: Alice > Carol > Bob (different order)
      await peerRanking.connect(voter2).updateRanking([1, 3, 2]);

      // Alice > Bob: 2 votes (voter1, voter2)
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(2);

      // Alice > Carol: 2 votes (voter1, voter2)
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(2);

      // Bob > Carol: 1 vote (voter1)
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(1);

      // Carol > Bob: 1 vote (voter2)
      expect(bn(await peerRanking.getComparisonCount(3, 2))).to.equal(1);
    });

    it("Should handle ranking updates correctly", async function () {
      // Initial ranking: Alice > Bob > Carol
      await peerRanking.connect(voter1).updateRanking([1, 2, 3]);

      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(1); // Alice > Carol
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(1); // Bob > Carol

      // Update ranking: Carol > Alice > Bob
      await peerRanking.connect(voter1).updateRanking([3, 1, 2]);

      // New comparisons after update: Carol > Alice, Carol > Bob, Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(3, 1))).to.equal(1); // Carol > Alice (new)
      expect(bn(await peerRanking.getComparisonCount(3, 2))).to.equal(1); // Carol > Bob (new)
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob (still exists)

      // Old comparisons that should be removed
      expect(bn(await peerRanking.getComparisonCount(1, 3))).to.equal(0); // Alice > Carol (removed)
      expect(bn(await peerRanking.getComparisonCount(2, 3))).to.equal(0); // Bob > Carol (removed)
    });
  });

  describe("Complex Scenarios", function () {
    it("Should handle partial rankings", async function () {
      // Voter1 ranks only 2 candidates: Alice > Bob
      await peerRanking.connect(voter1).updateRanking([1, 2]);

      // Voter2 ranks all 4: Carol > David > Alice > Bob
      await peerRanking.connect(voter2).updateRanking([3, 4, 1, 2]);

      // Alice > Bob should have 2 votes
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(2);

      // Carol > David should have 1 vote (only voter2)
      expect(bn(await peerRanking.getComparisonCount(3, 4))).to.equal(1);

      // Carol > Alice should have 1 vote (only voter2)
      expect(bn(await peerRanking.getComparisonCount(3, 1))).to.equal(1);
    });

    it("Should handle conflicting preferences", async function () {
      // Voter1: Alice > Bob
      await peerRanking.connect(voter1).updateRanking([1, 2]);

      // Voter2: Bob > Alice (opposite preference)
      await peerRanking.connect(voter2).updateRanking([2, 1]);

      // Both directions should have 1 vote each
      expect(bn(await peerRanking.getComparisonCount(1, 2))).to.equal(1); // Alice > Bob
      expect(bn(await peerRanking.getComparisonCount(2, 1))).to.equal(1); // Bob > Alice
    });

    it("Should track multiple ranking updates per user", async function () {
      // Initial ranking
      await peerRanking.connect(voter1).updateRanking([1, 2, 3]);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);

      // Update ranking (should not increase ranker count)
      await peerRanking.connect(voter1).updateRanking([3, 2, 1]);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(1);

      // Different user
      await peerRanking.connect(voter2).updateRanking([1, 3, 2]);
      expect(bn(await peerRanking.getTotalRankers())).to.equal(2);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should handle large rankings efficiently", async function () {
      // Test with all 4 candidates
      const ranking = [1, 2, 3, 4];

      const tx = await peerRanking.connect(voter1).updateRanking(ranking);
      const receipt = await tx.wait();

      console.log(`Gas used for 4-candidate ranking: ${receipt.gasUsed.toString()}`);

      // Should be reasonable gas usage (less than 600k for initial ranking)
      expect(Number(receipt.gasUsed)).to.be.lessThan(600000);
    });

    it("Should optimize ranking updates", async function () {
      // Initial ranking
      await peerRanking.connect(voter1).updateRanking([1, 2, 3, 4]);

      // Small update (swap two adjacent candidates)
      const tx = await peerRanking.connect(voter1).updateRanking([1, 3, 2, 4]);
      const receipt = await tx.wait();

      console.log(`Gas used for ranking update: ${receipt.gasUsed.toString()}`);

      // Update should use less gas than initial ranking
      expect(Number(receipt.gasUsed)).to.be.lessThan(250000);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle duplicate candidate IDs gracefully", async function () {
      // This should be handled by the frontend, but test contract behavior
      const ranking = [1, 1, 2]; // Alice appears twice

      await peerRanking.connect(voter1).updateRanking(ranking);

      // Should still generate valid comparisons
      const storedRanking = await peerRanking.getUserRanking(voter1.address);
      expect(storedRanking.length).to.equal(3);
    });

    it("Should handle maximum candidate count", async function () {
      // Add more candidates to test limits
      for (let i = 5; i <= 10; i++) {
        await electionManager.addCandidate(`Candidate ${i}`, `Description ${i}`);
      }

      // Rank all 10 candidates
      const ranking = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const tx = await peerRanking.connect(voter1).updateRanking(ranking);
      const receipt = await tx.wait();

      console.log(`Gas used for 10-candidate ranking: ${receipt.gasUsed.toString()}`);

      // Should still be manageable gas usage (10 candidates is a large ranking)
      expect(Number(receipt.gasUsed)).to.be.lessThan(2000000);
    });
  });
});
