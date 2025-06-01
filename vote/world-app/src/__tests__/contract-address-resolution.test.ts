/**
 * Test to verify contract address resolution is working correctly
 */

describe('Contract Address Resolution', () => {
  it('should resolve ELECTION_MANAGER_ADDRESS correctly', () => {
    // Import the contract config
    const { ELECTION_MANAGER_ADDRESS, CURRENT_NETWORK } = require('@/config/contracts');
    
    console.log('🔍 Testing contract address resolution...');
    console.log('ELECTION_MANAGER_ADDRESS:', ELECTION_MANAGER_ADDRESS);
    console.log('CURRENT_NETWORK:', CURRENT_NETWORK);
    
    // Verify the address is correct
    expect(ELECTION_MANAGER_ADDRESS).toBe('0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC');
    expect(typeof ELECTION_MANAGER_ADDRESS).toBe('string');
    expect(ELECTION_MANAGER_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    
    console.log('✅ ELECTION_MANAGER_ADDRESS resolved correctly');
  });

  it('should handle MockWorldID address safely', () => {
    const { getMockWorldIdAddress } = require('@/config/contracts');
    const mockWorldIdAddress = getMockWorldIdAddress();
    console.log('MockWorldID address:', mockWorldIdAddress);

    // On testnet, this should be null since we don't use MockWorldID
    if (mockWorldIdAddress) {
      expect(typeof mockWorldIdAddress).toBe('string');
      expect(mockWorldIdAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      console.log('✅ MockWorldID address resolved correctly');
    } else {
      console.log('✅ MockWorldID not available (expected on testnet/mainnet)');
    }
  });

  it('should test the exact same import pattern as useElectionManager', () => {
    // This mirrors the exact import from useElectionManager.ts
    const { CURRENT_NETWORK, ELECTION_MANAGER_ADDRESS } = require('@/config/contracts');
    
    console.log('🔍 Testing exact same import pattern as useElectionManager...');
    console.log('CURRENT_NETWORK.rpcUrl:', CURRENT_NETWORK.rpcUrl);
    console.log('ELECTION_MANAGER_ADDRESS:', ELECTION_MANAGER_ADDRESS);
    
    // Verify the values match what we expect
    expect(CURRENT_NETWORK.rpcUrl).toContain('worldchain-sepolia');
    expect(ELECTION_MANAGER_ADDRESS).toBe('0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC');
    
    console.log('✅ Import pattern matches useElectionManager exactly');
  });

  it('should verify network configuration', () => {
    const { CURRENT_NETWORK, NETWORKS } = require('@/config/contracts');
    
    console.log('🔍 Testing network configuration...');
    console.log('CURRENT_NETWORK.chainId:', CURRENT_NETWORK.chainId);
    console.log('CURRENT_NETWORK.name:', CURRENT_NETWORK.name);
    console.log('Available networks:', Object.keys(NETWORKS));
    
    expect(CURRENT_NETWORK.chainId).toBe(4801);
    expect(CURRENT_NETWORK.name).toBe('World Chain Sepolia');
    expect(NETWORKS[4801]).toBeDefined();
    
    console.log('✅ Network configuration is correct');
  });

  it('should test contract address getter function', () => {
    const { getContractAddress } = require('@/config/contracts');
    
    console.log('🔍 Testing getContractAddress function...');
    
    const electionManagerAddress = getContractAddress('ElectionManager');
    console.log('getContractAddress("ElectionManager"):', electionManagerAddress);
    
    expect(electionManagerAddress).toBe('0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC');
    
    console.log('✅ getContractAddress function works correctly');
  });
});
