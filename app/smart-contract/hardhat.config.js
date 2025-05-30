/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition-ethers");
require("dotenv").config({ path: ".env" });

module.exports = {
  solidity: "0.8.27",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    worldchain: {
      url:
        process.env.WORLD_CHAIN_SEPOLIA_RPC ||
        "https://worldchain-sepolia.g.alchemy.com/public",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 4801,
    },
  },
  etherscan: {
    apiKey: {
      worldchain: "abc", // Blockscout doesn't require API key
    },
    customChains: [
      {
        network: "worldchain",
        chainId: 4801,
        urls: {
          apiURL: "https://worldchain-sepolia.blockscout.com/api",
          browserURL: "https://worldchain-sepolia.blockscout.com",
        },
      },
    ],
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
};
