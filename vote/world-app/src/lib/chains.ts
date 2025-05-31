// Worldchain Sepolia testnet configuration
export const worldchain = {
  id: 4801,
  name: "Worldchain Sepolia",
  network: "worldchain-sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Sepolia Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        "https://worldchain-sepolia.g.alchemy.com/public",
        process.env.WORLD_CHAIN_SEPOLIA_RPC || "https://rpc.ankr.com/worldchain_sepolia/f10d7c2749d642e1b0f22c0e8833eaeb67fc01097f5d12614fedf618e36c8d99",
        "https://worldchain-sepolia.gateway.tenderly.co",
        "https://rpc.worldchain-sepolia.org"
      ],
    },
    public: {
      http: [
        process.env.WORLD_CHAIN_SEPOLIA_RPC || "https://rpc.ankr.com/worldchain_sepolia/f10d7c2749d642e1b0f22c0e8833eaeb67fc01097f5d12614fedf618e36c8d99",
        "https://worldchain-sepolia.g.alchemy.com/public",
        "https://worldchain-sepolia.gateway.tenderly.co",
        "https://rpc.worldchain-sepolia.org"
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Worldchain Sepolia Explorer",
      url: "https://worldchain-sepolia.blockscout.com",
    },
  },
};
