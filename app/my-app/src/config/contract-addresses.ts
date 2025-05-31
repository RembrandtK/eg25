/**
 * Generated Contract Addresses
 * Auto-generated from Ignition deployments at build time
 * DO NOT EDIT MANUALLY - Run 'npm run generate-addresses' to update
 */

export const CHAIN_ID = 4801;

// Contract addresses for Worldchain Sepolia
export const WORLD_ID_ADDRESS_BOOK = "0xA26948dA2413b7a009ae38334Cc787f292A290fe" as const;
export const ELECTION_MANAGER_ADDRESS = "0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7" as const;
export const PEER_RANKING_ADDRESS = "0x2caDc553c4B98863A3937fF0E710b79F7E855d8a" as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 4801,
  name: "Worldchain Sepolia",
  rpcUrl: process.env.WORLD_CHAIN_SEPOLIA_RPC || process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC || "https://worldchain-sepolia.g.alchemy.com/public",
  blockExplorer: "https://worldchain-sepolia.blockscout.com",
} as const;

// Contract configuration
export const CONTRACTS = {
  WorldIDAddressBook: {
    address: WORLD_ID_ADDRESS_BOOK,
    verified: false,
  },
  ElectionManager: {
    address: ELECTION_MANAGER_ADDRESS,
    verified: false,
  },
  PeerRanking: {
    address: PEER_RANKING_ADDRESS,
    verified: false,
  },
} as const;

// Deployment info
export const DEPLOYMENT_INFO = {
  chainId: 4801,
  timestamp: "2025-05-31T02:28:33.947Z",
  addresses: {
  "WORLD_ID_ADDRESS_BOOK": "0xA26948dA2413b7a009ae38334Cc787f292A290fe",
  "ELECTION_MANAGER_ADDRESS": "0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7",
  "PEER_RANKING_ADDRESS": "0x2caDc553c4B98863A3937fF0E710b79F7E855d8a"
},
} as const;
