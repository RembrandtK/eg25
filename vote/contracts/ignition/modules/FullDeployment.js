const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("FullDeployment", (m) => {
  // Get deployment parameters
  const useExistingAddressBook = m.getParameter("useExistingAddressBook", false);
  const existingAddressBookAddress = m.getParameter("existingAddressBookAddress", "0x0000000000000000000000000000000000000000");
  const testAddresses = m.getParameter("testAddresses", []);
  const verificationDuration = m.getParameter("verificationDuration", 365 * 24 * 60 * 60); // 1 year

  let addressBookAddress;

  if (useExistingAddressBook && existingAddressBookAddress !== "0x0000000000000000000000000000000000000000") {
    // Use existing address book (for mainnet)
    addressBookAddress = existingAddressBookAddress;
  } else {
    // Deploy mock address book for testing
    const mockAddressBook = m.contract("MockWorldIDAddressBook");
    addressBookAddress = mockAddressBook;

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
  }

  // Deploy TUTE contract
  const tute = m.contract("TUTE", [addressBookAddress]);

  return {
    mockAddressBook: useExistingAddressBook ? null : addressBookAddress,
    tute,
    addressBookAddress,
  };
});
