const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MockWorldIDDeployment", (m) => {
  // Deploy the mock World ID router
  const mockWorldID = m.contract("MockWorldID");

  return { mockWorldID };
});
