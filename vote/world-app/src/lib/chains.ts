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
        process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC || "https://worldchain-sepolia.gateway.tenderly.co",
        "https://rpc.worldchain-sepolia.org"
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC || "https://worldchain-sepolia.gateway.tenderly.co",
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
