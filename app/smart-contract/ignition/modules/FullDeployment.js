const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("FullDeployment", (m) => {
  // Get deployment parameters
  const useExistingAddressBook = m.getParameter("useExistingAddressBook", false);
  const existingAddressBookAddress = m.getParameter("existingAddressBookAddress", "0x0000000000000000000000000000000000000000");
  const testAddresses = m.getParameter("testAddresses", []);
  const verificationDuration = m.getParameter("verificationDuration", 365 * 24 * 60 * 60); // 1 year

  let addressBook;

  if (useExistingAddressBook && existingAddressBookAddress !== "0x0000000000000000000000000000000000000000") {
    // Use existing address book (for mainnet)
    addressBook = m.contractAt("IWorldIdAddressBook", existingAddressBookAddress);
  } else {
    // Deploy mock address book for testing
    addressBook = m.contract("MockWorldIDAddressBook");

    // Verify test addresses if provided
    if (testAddresses.length > 0) {
      const currentTime = Math.floor(Date.now() / 1000);
      const verifiedUntil = currentTime + verificationDuration;

      testAddresses.forEach((address, index) => {
        m.call(addressBook, "setAddressVerifiedUntil", [address, verifiedUntil], {
          id: `verify_address_${index}`,
        });
      });
    }
  }

  // Deploy TUTE contract
  const tute = m.contract("TUTE", [addressBook]);

  return { 
    addressBook, 
    tute,
    // Export useful info
    isUsingMockAddressBook: !useExistingAddressBook,
    verifiedAddresses: testAddresses,
  };
});
