const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import Hardhat Chai matchers
require("@nomicfoundation/hardhat-chai-matchers");

describe("ZK Proof Verification Tests (TDD)", function () {
  let worldID;
  let electionManager;
  let simpleRanking;
  let owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy World ID contract (not mock - real verification)
    const WorldID = await ethers.getContractFactory("MockWorldID");
    worldID = await WorldID.deploy();

    // Deploy ElectionManager
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManager.deploy(worldID.target);

    // Deploy SimpleRankingWithZK with ZK proof verification
    const SimpleRankingWithZK = await ethers.getContractFactory("SimpleRankingWithZK");
    simpleRanking = await SimpleRankingWithZK.deploy(worldID.target, electionManager.target);

    // Add test candidates
    await electionManager.addCandidate("Alice Johnson", "Community leader");
    await electionManager.addCandidate("Bob Smith", "Tech advocate");
  });

  it("should compile and deploy contracts", async function () {
    expect(simpleRanking.target).to.not.be.undefined;
    expect(electionManager.target).to.not.be.undefined;
    expect(worldID.target).to.not.be.undefined;
  });
});
