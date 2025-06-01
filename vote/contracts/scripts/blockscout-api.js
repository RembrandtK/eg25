const axios = require("axios");

/**
 * Blockscout API utilities for contract information and verification
 */

// Network configurations with Blockscout URLs (Official Alchemy-hosted Blockscout instances)
const NETWORKS = {
  4801: {
    name: "World Chain Sepolia",
    blockscoutUrl: "https://worldchain-sepolia.explorer.alchemy.com",
    chainId: 4801,
    isTestnet: true
  },
  480: {
    name: "World Chain Mainnet",
    blockscoutUrl: "https://worldchain-mainnet.explorer.alchemy.com",
    chainId: 480,
    isTestnet: false
  }
};

/**
 * Get network configuration by chain ID
 */
function getNetworkConfig(chainId) {
  const config = NETWORKS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
}

/**
 * Make API request to Blockscout with error handling
 */
async function makeBlockscoutRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      timeout: 10000,
      ...options
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.warn(`Blockscout API error (${error.response.status}): ${error.response.statusText}`);
      return null;
    } else if (error.code === 'ECONNABORTED') {
      console.warn(`Blockscout API timeout for: ${url}`);
      return null;
    } else {
      console.warn(`Blockscout API error: ${error.message}`);
      return null;
    }
  }
}

/**
 * Get contract information from Blockscout
 */
async function getContractInfo(chainId, contractAddress) {
  const network = getNetworkConfig(chainId);
  const url = `${network.blockscoutUrl}/api/v2/smart-contracts/${contractAddress}`;
  
  const data = await makeBlockscoutRequest(url);
  if (!data) return null;

  return {
    address: contractAddress,
    name: data.name || "Unknown",
    isVerified: data.is_verified || false,
    compilerVersion: data.compiler_version,
    optimizationEnabled: data.optimization_enabled,
    evmVersion: data.evm_version,
    constructorArgs: data.constructor_args,
    abi: data.abi,
    sourceCode: data.source_code,
    creationTxHash: data.creation_tx_hash,
    createdAtBlock: data.created_at_block_number,
    blockscoutUrl: `${network.blockscoutUrl}/address/${contractAddress}`
  };
}

/**
 * Check if contract verification service is available
 */
async function checkVerificationService(chainId) {
  const network = getNetworkConfig(chainId);
  const url = `${network.blockscoutUrl}/api/v2/smart-contracts/verification/config`;
  
  const data = await makeBlockscoutRequest(url);
  return data !== null;
}

/**
 * Verify contract using flattened source code
 */
async function verifyContract(chainId, contractAddress, verificationData) {
  const network = getNetworkConfig(chainId);
  const url = `${network.blockscoutUrl}/api/v2/smart-contracts/${contractAddress}/verification/via/flattened-code`;
  
  const data = await makeBlockscoutRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: verificationData
  });
  
  return data;
}

/**
 * Get contract creation transaction details
 */
async function getContractCreationTx(chainId, contractAddress) {
  const network = getNetworkConfig(chainId);
  const url = `${network.blockscoutUrl}/api/v2/addresses/${contractAddress}/transactions?filter=to`;
  
  const data = await makeBlockscoutRequest(url);
  if (!data || !data.items || data.items.length === 0) return null;
  
  // Find the contract creation transaction (to address is null)
  const creationTx = data.items.find(tx => tx.to === null);
  return creationTx;
}

/**
 * Get multiple contracts info in parallel with rate limiting
 */
async function getMultipleContractsInfo(chainId, contractAddresses) {
  const results = [];
  const batchSize = 3; // Limit concurrent requests
  
  for (let i = 0; i < contractAddresses.length; i += batchSize) {
    const batch = contractAddresses.slice(i, i + batchSize);
    const batchPromises = batch.map(address => getContractInfo(chainId, address));
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to be respectful to the API
    if (i + batchSize < contractAddresses.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

module.exports = {
  NETWORKS,
  getNetworkConfig,
  makeBlockscoutRequest,
  getContractInfo,
  checkVerificationService,
  verifyContract,
  getContractCreationTx,
  getMultipleContractsInfo
};
