const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TestnetDeployment", (m) => {
  // Deploy mock World ID Address Book for testing
  const mockAddressBook = m.contract("MockWorldIDAddressBook");

  // Get test addresses from parameters
  const testAddresses = m.getParameter("testAddresses", []);
  const verificationDuration = m.getParameter("verificationDuration", 365 * 24 * 60 * 60); // 1 year

  // Verify test addresses if provided
  if (testAddresses.length > 0) {
    const currentTime = Math.floor(Date.now() / 1000);
    const verifiedUntil = currentTime + verificationDuration;

    testAddresses.forEach((address, index) => {
      m.call(mockAddressBook, "setAddressVerifiedUntil", [address, verifiedUntil], {
        id: `verify_address_${index}`,
      });
    });
  }

  // Deploy TUTE contract with mock address book
  const tute = m.contract("TUTE", [mockAddressBook]);

  return { 
    mockAddressBook,
    tute,
  };
});
