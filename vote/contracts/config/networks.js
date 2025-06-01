/**
 * Network-specific configuration for World ID and other contracts
 */

const WORLD_ID_ADDRESSES = {
  // Mainnet networks
  1: "0x163b09b4fE21177c455D850BD815B6D583732432", // Ethereum Mainnet
  10: "0x57f928158C3EE7CDad1e4D8642503c4D0201f611", // Optimism
  137: "0x57f928158C3EE7CDad1e4D8642503c4D0201f611", // Polygon
  480: "0x57f928158C3EE7CDad1e4D8642503c4D0201f611", // World Chain Mainnet
  
  // Testnet networks
  11155111: "0x469449f251692e0779667583026b5a1e99512157", // Sepolia
  84532: "0x42FF98C4E85212a5D31358ACbFe76a621b50fC02", // Base Sepolia
  4801: "0x57f928158C3EE7CDad1e4D8642503c4D0201f611", // World Chain Sepolia
  
  // Local development
  31337: "0x57f928158C3EE7CDad1e4D8642503c4D0201f611", // Hardhat (use World Chain Sepolia address for testing)
};

const MOCK_WORLD_ID_ADDRESS = "0x3cA8D240BE0C1E83ad287A613Fd22EaB0dD08764"; // For local testing

/**
 * Get World ID Router address for a given chain ID
 * @param {number} chainId - The chain ID
 * @param {boolean} useMock - Whether to use mock World ID for testing
 * @returns {string} World ID Router address
 */
function getWorldIdAddress(chainId, useMock = false) {
  if (useMock) {
    return MOCK_WORLD_ID_ADDRESS;
  }
  
  const address = WORLD_ID_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`World ID Router address not configured for chain ID: ${chainId}`);
  }
  
  return address;
}

/**
 * Get network configuration for deployment
 * @param {string} networkName - The network name from hardhat config
 * @param {number} chainId - The chain ID
 * @returns {object} Network configuration
 */
function getNetworkConfig(networkName, chainId) {
  const isTestnet = [11155111, 84532, 4801, 31337].includes(chainId);
  const isLocal = chainId === 31337;
  
  return {
    chainId,
    networkName,
    isTestnet,
    isLocal,
    worldIdRouter: getWorldIdAddress(chainId, isLocal && process.env.USE_MOCK_WORLD_ID === "true"),
    worldIdAppId: process.env.WORLD_ID_APP_ID || "app_10719845a0977ef63ebe8eb9edb890ad",
    // Add other network-specific configs here
  };
}

/**
 * Network name mappings
 */
const NETWORK_NAMES = {
  1: "ethereum",
  10: "optimism", 
  137: "polygon",
  480: "worldchain",
  11155111: "sepolia",
  84532: "base-sepolia",
  4801: "worldchain-sepolia",
  31337: "hardhat"
};

/**
 * Get human-readable network name
 * @param {number} chainId - The chain ID
 * @returns {string} Network name
 */
function getNetworkName(chainId) {
  return NETWORK_NAMES[chainId] || `unknown-${chainId}`;
}

/**
 * Check if a network supports World ID
 * @param {number} chainId - The chain ID
 * @returns {boolean} Whether the network supports World ID
 */
function supportsWorldId(chainId) {
  return chainId in WORLD_ID_ADDRESSES;
}

module.exports = {
  WORLD_ID_ADDRESSES,
  MOCK_WORLD_ID_ADDRESS,
  getWorldIdAddress,
  getNetworkConfig,
  getNetworkName,
  supportsWorldId,
  NETWORK_NAMES
};
