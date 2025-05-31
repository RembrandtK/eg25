const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MockWorldIDDeployment", (m) => {
  // Deploy MockWorldIDAddressBook
  const mockWorldIDAddressBook = m.contract("MockWorldIDAddressBook");

  return {
    mockWorldIDAddressBook,
  };
});
