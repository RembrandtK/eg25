import { loadElections, checkVoteStatus, Election } from '@/lib/electionLoader';

describe('electionLoader - ACTUAL app functions', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      readContract: jest.fn()
    };
  });

  describe('loadElections', () => {
    it('should load elections using the ACTUAL loadElections function - OBJECT format', async () => {
      // Test if getAllElections() returns objects (what useElectionManager expects)
      const mockElectionData = [
        {
          id: BigInt(1),
          title: "Test Election 2025",
          description: "Test election description",
          worldIdAction: "test-election-1",
          creator: "0xcreator1",
          electionAddress: "0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83",
          createdAt: BigInt(1234567890),
          active: true
        },
        {
          id: BigInt(2),
          title: "Test Election 2025",
          description: "Test election description 2",
          worldIdAction: "test-election-2",
          creator: "0xcreator2",
          electionAddress: "0xadBF59db1E09A309ca7c290D099E1d8591605eE4",
          createdAt: BigInt(1234567891),
          active: true
        }
      ];

      mockClient.readContract.mockResolvedValueOnce(mockElectionData);

      const elections = await loadElections(mockClient);

      expect(elections).toHaveLength(2);
      expect(elections[0]).toEqual({
        id: BigInt(1),
        title: "Test Election 2025",
        electionAddress: "0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83",
        worldIdAction: "test-election-1",
        candidateCount: BigInt(4),
        isActive: true
      });
      expect(elections[1]).toEqual({
        id: BigInt(2),
        title: "Test Election 2025", 
        electionAddress: "0xadBF59db1E09A309ca7c290D099E1d8591605eE4",
        worldIdAction: "test-election-2",
        candidateCount: BigInt(4),
        isActive: true
      });
    });

    it('should handle array format from getAllElections (if Solidity returns arrays)', async () => {
      // Test if getAllElections returns arrays instead of objects
      const mockElectionArrays = [
        ["0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83", "Test Election 2025", "test-election-1", BigInt(4), true],
        ["0xadBF59db1E09A309ca7c290D099E1d8591605eE4", "Test Election 2025", "test-election-2", BigInt(4), true]
      ];

      mockClient.readContract.mockResolvedValueOnce(mockElectionArrays);

      const elections = await loadElections(mockClient);

      expect(elections).toHaveLength(2);
      expect(elections[0]).toEqual({
        id: BigInt(1),
        title: "Test Election 2025",
        electionAddress: "0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83",
        worldIdAction: "test-election-1", 
        candidateCount: BigInt(4),
        isActive: true
      });
    });

    it('should handle empty elections list', async () => {
      mockClient.readContract.mockResolvedValueOnce([]);

      const elections = await loadElections(mockClient);

      expect(elections).toHaveLength(0);
      expect(elections).toEqual([]);
    });

    it('should handle contract errors', async () => {
      mockClient.readContract.mockRejectedValueOnce(new Error("ElectionManager contract call failed"));

      await expect(loadElections(mockClient))
        .rejects.toThrow("ElectionManager contract call failed");
    });

    it('should verify the exact contract call made', async () => {
      mockClient.readContract.mockResolvedValueOnce([]);

      await loadElections(mockClient);

      expect(mockClient.readContract).toHaveBeenCalledTimes(1);
      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: expect.any(String), // CURRENT_NETWORK.electionManagerAddress
        abi: expect.any(Array), // ELECTION_MANAGER_ABI
        functionName: 'getAllElections',
      });
    });
  });

  describe('checkVoteStatus', () => {
    it('should check if user has voted using the ACTUAL checkVoteStatus function', async () => {
      const electionAddress = "0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83" as `0x${string}`;
      const userAddress = "0x3c6c2348d430996285672346258afb8528086d5a" as `0x${string}`;

      // Mock hasVoted() returning false (user hasn't voted)
      mockClient.readContract.mockResolvedValueOnce(false);

      const hasVoted = await checkVoteStatus(electionAddress, userAddress, mockClient);

      expect(hasVoted).toBe(false);
      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: electionAddress,
        abi: expect.any(Array), // Election ABI
        functionName: 'hasVoted',
        args: [userAddress],
      });
    });

    it('should return true when user has voted', async () => {
      const electionAddress = "0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83" as `0x${string}`;
      const userAddress = "0x3c6c2348d430996285672346258afb8528086d5a" as `0x${string}`;

      mockClient.readContract.mockResolvedValueOnce(true);

      const hasVoted = await checkVoteStatus(electionAddress, userAddress, mockClient);

      expect(hasVoted).toBe(true);
    });

    it('should handle vote status check errors', async () => {
      const electionAddress = "0xtest" as `0x${string}`;
      const userAddress = "0xuser" as `0x${string}`;

      mockClient.readContract.mockRejectedValueOnce(new Error("hasVoted call failed"));

      await expect(checkVoteStatus(electionAddress, userAddress, mockClient))
        .rejects.toThrow("hasVoted call failed");
    });
  });
});
