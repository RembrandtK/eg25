/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useElectionManager } from '@/hooks/useElectionManager';

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    readContract: jest.fn(),
  })),
  http: jest.fn(),
}));

// Mock worldchain sepolia
jest.mock('viem/chains', () => ({
  worldchainSepolia: {},
}));

// Mock config
jest.mock('@/config/contracts', () => ({
  CURRENT_NETWORK: {
    rpcUrl: 'https://test-rpc.com',
  },
  ELECTION_MANAGER_ADDRESS: '0x1234567890123456789012345678901234567890',
}));

// Mock ABI
jest.mock('@/election-manager-abi', () => ({
  ELECTION_MANAGER_ABI: [],
}));

describe('useElectionManager', () => {
  const mockReadContract = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { createPublicClient } = require('viem');
    createPublicClient.mockReturnValue({
      readContract: mockReadContract,
    });
  });

  it('should load elections successfully', async () => {
    // Mock election count
    mockReadContract
      .mockResolvedValueOnce(2n) // getElectionCount returns 2
      .mockResolvedValueOnce([
        '0xElection1Address',
        'Test Election 1',
        'First test election',
        'vote',
        4,
        true,
        '0xCreator1'
      ])
      .mockResolvedValueOnce([
        '0xElection2Address',
        'Test Election 2',
        'Second test election',
        'vote2',
        3,
        false,
        '0xCreator2'
      ]);

    const { result } = renderHook(() => useElectionManager());

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.elections).toEqual([]);

    // Wait for elections to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.elections).toHaveLength(2);
    expect(result.current.elections[0]).toEqual({
      id: 0n,
      address: '0xElection1Address',
      name: 'Test Election 1',
      description: 'First test election',
      worldIdAction: 'vote',
      candidateCount: 4,
      isActive: true,
      creator: '0xCreator1',
    });

    expect(result.current.hasElections).toBe(true);
    expect(result.current.activeElectionCount).toBe(1);
  });

  it('should handle no elections', async () => {
    mockReadContract.mockResolvedValueOnce(0n); // getElectionCount returns 0

    const { result } = renderHook(() => useElectionManager());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.elections).toEqual([]);
    expect(result.current.hasElections).toBe(false);
    expect(result.current.activeElectionCount).toBe(0);
  });

  it('should handle errors gracefully', async () => {
    mockReadContract.mockRejectedValueOnce(new Error('Contract read failed'));

    const { result } = renderHook(() => useElectionManager());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Contract read failed');
    expect(result.current.elections).toEqual([]);
  });

  it('should filter active elections correctly', async () => {
    mockReadContract
      .mockResolvedValueOnce(2n)
      .mockResolvedValueOnce([
        '0xElection1Address',
        'Active Election',
        'Active election',
        'vote',
        4,
        true,
        '0xCreator1'
      ])
      .mockResolvedValueOnce([
        '0xElection2Address',
        'Inactive Election',
        'Inactive election',
        'vote2',
        3,
        false,
        '0xCreator2'
      ]);

    const { result } = renderHook(() => useElectionManager());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const activeElections = result.current.getActiveElections();
    expect(activeElections).toHaveLength(1);
    expect(activeElections[0].name).toBe('Active Election');
  });

  it('should get specific election by ID', async () => {
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce([
        '0xElection1Address',
        'Test Election',
        'Test description',
        'vote',
        4,
        true,
        '0xCreator1'
      ]);

    const { result } = renderHook(() => useElectionManager());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const election = result.current.getElection(0n);
    expect(election).toBeDefined();
    expect(election?.name).toBe('Test Election');

    const nonExistentElection = result.current.getElection(999n);
    expect(nonExistentElection).toBeUndefined();
  });
});
