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
      http: ["https://worldchain-sepolia.g.alchemy.com/public"],
    },
    public: {
      http: ["https://worldchain-sepolia.g.alchemy.com/public"],
    },
  },
  blockExplorers: {
    default: {
      name: "Worldchain Sepolia Explorer",
      url: "https://worldchain-sepolia.blockscout.com",
    },
  },
};
