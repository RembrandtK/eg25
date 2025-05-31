/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useElectionVoting } from '@/hooks/useElectionVoting';

// Mock MiniKit
const mockMiniKit = {
  isInstalled: jest.fn(() => true),
  commandsAsync: {
    verify: jest.fn(),
    sendTransaction: jest.fn(),
  },
};

jest.mock('@worldcoin/minikit-js', () => ({
  MiniKit: mockMiniKit,
  VerificationLevel: {
    Orb: 'orb',
  },
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        address: '0x1234567890123456789012345678901234567890',
      },
    },
  })),
}));

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    readContract: jest.fn(),
  })),
  http: jest.fn(),
}));

jest.mock('viem/chains', () => ({
  worldchainSepolia: {},
}));

jest.mock('@/config/contracts', () => ({
  CURRENT_NETWORK: {
    rpcUrl: 'https://test-rpc.com',
  },
}));

describe('useElectionVoting', () => {
  const mockProps = {
    electionAddress: '0xElectionAddress',
    electionAbi: [],
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useElectionVoting(mockProps));

    expect(result.current.isVoting).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.currentVote).toEqual([]);
    expect(result.current.lastTxId).toBeNull();
    expect(result.current.hasVoted).toBe(false);
  });

  it('should submit vote successfully', async () => {
    // Mock successful World ID verification
    mockMiniKit.commandsAsync.verify.mockResolvedValueOnce({
      finalPayload: {
        status: 'success',
        verification_level: 'orb',
        merkle_root: '0xroot',
        nullifier_hash: '0xnullifier',
        proof: '0xproof',
      },
    });

    // Mock successful transaction
    mockMiniKit.commandsAsync.sendTransaction.mockResolvedValueOnce({
      finalPayload: {
        status: 'success',
        transaction_id: '0xtxid',
      },
    });

    const { result } = renderHook(() => useElectionVoting(mockProps));

    await act(async () => {
      await result.current.submitVote([1n, 2n, 3n]);
    });

    expect(mockProps.onSuccess).toHaveBeenCalledWith('0xtxid');
    expect(result.current.lastTxId).toBe('0xtxid');
  });

  it('should handle World ID verification failure', async () => {
    mockMiniKit.commandsAsync.verify.mockResolvedValueOnce({
      finalPayload: {
        status: 'error',
        error_code: 'verification_failed',
      },
    });

    const { result } = renderHook(() => useElectionVoting(mockProps));

    await act(async () => {
      await result.current.submitVote([1n, 2n, 3n]);
    });

    expect(mockProps.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('World ID verification failed'),
      })
    );
  });

  it('should handle transaction failure', async () => {
    // Mock successful World ID verification
    mockMiniKit.commandsAsync.verify.mockResolvedValueOnce({
      finalPayload: {
        status: 'success',
        verification_level: 'orb',
        merkle_root: '0xroot',
        nullifier_hash: '0xnullifier',
        proof: '0xproof',
      },
    });

    // Mock failed transaction
    mockMiniKit.commandsAsync.sendTransaction.mockResolvedValueOnce({
      finalPayload: {
        status: 'error',
        error_code: 'transaction_failed',
      },
    });

    const { result } = renderHook(() => useElectionVoting(mockProps));

    await act(async () => {
      await result.current.submitVote([1n, 2n, 3n]);
    });

    expect(mockProps.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Transaction failed'),
      })
    );
  });

  it('should handle MiniKit not installed', async () => {
    mockMiniKit.isInstalled.mockReturnValueOnce(false);

    const { result } = renderHook(() => useElectionVoting(mockProps));

    await act(async () => {
      await result.current.submitVote([1n, 2n, 3n]);
    });

    expect(mockProps.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'MiniKit is not installed',
      })
    );
  });

  it('should handle empty vote submission', async () => {
    const { result } = renderHook(() => useElectionVoting(mockProps));

    await act(async () => {
      await result.current.submitVote([]);
    });

    expect(mockProps.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'No candidates ranked',
      })
    );
  });

  it('should set voting state correctly during submission', async () => {
    // Mock slow verification to test loading state
    let resolveVerification: (value: any) => void;
    const verificationPromise = new Promise((resolve) => {
      resolveVerification = resolve;
    });
    mockMiniKit.commandsAsync.verify.mockReturnValueOnce(verificationPromise);

    const { result } = renderHook(() => useElectionVoting(mockProps));

    // Start vote submission
    act(() => {
      result.current.submitVote([1n, 2n, 3n]);
    });

    // Should be in voting state
    expect(result.current.isVoting).toBe(true);

    // Complete verification
    act(() => {
      resolveVerification!({
        finalPayload: {
          status: 'success',
          verification_level: 'orb',
          merkle_root: '0xroot',
          nullifier_hash: '0xnullifier',
          proof: '0xproof',
        },
      });
    });

    // Mock successful transaction
    mockMiniKit.commandsAsync.sendTransaction.mockResolvedValueOnce({
      finalPayload: {
        status: 'success',
        transaction_id: '0xtxid',
      },
    });

    await waitFor(() => {
      expect(result.current.isVoting).toBe(false);
    });
  });
});
