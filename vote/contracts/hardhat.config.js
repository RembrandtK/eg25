/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition-ethers");
require("dotenv").config({ path: ".env" });

module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // forking: process.env.FORK_URL ? {
        // url: process.env.FORK_URL,
        // blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined,
      // } : undefined,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    "worldchain-sepolia": {
      url: process.env.WORLD_CHAIN_SEPOLIA_RPC || "https://worldchain-sepolia.gateway.tenderly.co",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 4801,
    },
    "worldchain-sepolia-fork": {
      url: "http://127.0.0.1:8545", // Local anvil fork
      chainId: 31337,
      forking: {
        url: process.env.WORLD_CHAIN_SEPOLIA_RPC || "https://worldchain-sepolia.gateway.tenderly.co",
        blockNumber: undefined, // Use latest block
      },
    },
  },
  etherscan: {
    apiKey: {
      "worldchain-sepolia": "abc", // Blockscout doesn't require API key
    },
    customChains: [
      {
        network: "worldchain-sepolia",
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
