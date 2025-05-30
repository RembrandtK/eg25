const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MockWorldIDAddressBook", (m) => {
  // Deploy the mock World ID Address Book
  const mockAddressBook = m.contract("MockWorldIDAddressBook");

  return { mockAddressBook };
});
