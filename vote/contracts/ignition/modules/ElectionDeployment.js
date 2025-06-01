const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ElectionDeployment", (m) => {
  // Get deployment parameters
  const useExistingAddressBook = m.getParameter("useExistingAddressBook", false);
  const existingAddressBookAddress = m.getParameter("existingAddressBookAddress", "0x0000000000000000000000000000000000000000");
  const testAddresses = m.getParameter("testAddresses", []);
  const verificationDuration = m.getParameter("verificationDuration", 365 * 24 * 60 * 60); // 1 year
  const initialCandidates = m.getParameter("initialCandidates", []);

  // Get World ID configuration
  const useRealWorldId = m.getParameter("useRealWorldId", false);
  const worldIdRouter = m.getParameter("worldIdRouter", "0x0000000000000000000000000000000000000000");

  let worldIdContract;

  if (useRealWorldId && worldIdRouter !== "0x0000000000000000000000000000000000000000") {
    // Use real World ID Router (for production/testnet)
    console.log(`🌍 Using real World ID Router: ${worldIdRouter}`);
    worldIdContract = worldIdRouter;
  } else {
    // Deploy mock World ID for testing
    console.log("🧪 Using MockWorldID for testing");
    const mockWorldID = m.contract("MockWorldID");
    worldIdContract = mockWorldID;
  }

  // Deploy ElectionManager contract with MockWorldID dependency
  const electionManager = m.contract("ElectionManager", [worldIdContract]);

  // Add initial candidates if provided
  if (initialCandidates.length > 0) {
    initialCandidates.forEach((candidate, index) => {
      m.call(electionManager, "addCandidate", [candidate.name, candidate.description], {
        id: `add_candidate_${index}`,
      });
    });
  }

  const result = { electionManager };

  // Only include mockWorldID if we deployed it
  if (!useRealWorldId || worldIdRouter === "0x0000000000000000000000000000000000000000") {
    result.mockWorldID = worldIdContract;
  }

  return result;
});
