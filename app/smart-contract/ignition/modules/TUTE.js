const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TUTE", (m) => {
  // Parameters for deployment
  const worldIdAddressBook = m.getParameter("worldIdAddressBook");

  // Deploy the TUTE contract
  const tute = m.contract("TUTE", [worldIdAddressBook]);

  return { tute };
});
