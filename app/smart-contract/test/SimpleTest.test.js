const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Contract Test", function () {
  it("should deploy MockWorldID", async function () {
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    const mockWorldID = await MockWorldID.deploy();
    
    // Simple check
    expect(mockWorldID.target).to.be.a('string');
    expect(mockWorldID.target).to.match(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should deploy ElectionManager", async function () {
    const MockWorldID = await ethers.getContractFactory("MockWorldID");
    const mockWorldID = await MockWorldID.deploy();
    
    const ElectionManager = await ethers.getContractFactory("ElectionManager");
    const electionManager = await ElectionManager.deploy(mockWorldID.target);
    
    expect(electionManager.target).to.be.a('string');
    expect(electionManager.target).to.match(/^0x[a-fA-F0-9]{40}$/);
  });
});
