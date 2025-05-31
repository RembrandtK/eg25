const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SimpleRankingDeployment", (m) => {
  // Get the MockWorldIDAddressBook from the MockWorldIDDeployment module
  const { mockWorldIDAddressBook } = m.useModule(require("./MockWorldIDDeployment"));
  
  // Get the ElectionManager from the ElectionDeployment module
  const { electionManager } = m.useModule(require("./ElectionDeployment"));

  // Deploy SimpleRanking contract
  const simpleRanking = m.contract("SimpleRanking", [
    mockWorldIDAddressBook,
    electionManager
  ]);

  return { simpleRanking };
});
