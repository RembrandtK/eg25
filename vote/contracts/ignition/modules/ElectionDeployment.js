const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ElectionDeployment", (m) => {
  // Get deployment parameters
  const useExistingAddressBook = m.getParameter("useExistingAddressBook", false);
  const existingAddressBookAddress = m.getParameter("existingAddressBookAddress", "0x0000000000000000000000000000000000000000");
  const testAddresses = m.getParameter("testAddresses", []);
  const verificationDuration = m.getParameter("verificationDuration", 365 * 24 * 60 * 60); // 1 year
  const initialCandidates = m.getParameter("initialCandidates", []);

  // Deploy mock World ID for testing (always deploy for now)
  const mockWorldID = m.contract("MockWorldID");

  // Deploy ElectionManager contract with MockWorldID dependency
  const electionManager = m.contract("ElectionManager", [mockWorldID]);

  // Add initial candidates if provided
  if (initialCandidates.length > 0) {
    initialCandidates.forEach((candidate, index) => {
      m.call(electionManager, "addCandidate", [candidate.name, candidate.description], {
        id: `add_candidate_${index}`,
      });
    });
  }

  return {
    mockWorldID,
    electionManager,
  };
});
