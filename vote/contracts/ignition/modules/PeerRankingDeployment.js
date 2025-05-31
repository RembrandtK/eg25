const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PeerRankingDeployment", (m) => {
  // World ID Address Book on worldchain-sepolia
  const worldAddressBook = m.getParameter("worldAddressBook", "0x469449f251692e0779667583026b5a1e99512157");
  
  // Existing ElectionManager contract address
  const electionManager = m.getParameter("electionManager", "0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7");

  // Deploy PeerRanking contract
  const peerRanking = m.contract("PeerRanking", [worldAddressBook, electionManager]);

  return { peerRanking };
});
