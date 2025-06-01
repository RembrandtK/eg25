import { loadElectionCandidates, Candidate } from '@/lib/candidateLoader';

describe('candidateLoader - ACTUAL app functions', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      readContract: jest.fn()
    };
  });

  it('should load candidates using the ACTUAL loadElectionCandidates function', async () => {
    // Mock the exact responses that Solidity contracts return
    const mockCandidateCount = BigInt(4);
    
    // Solidity candidates() function returns: [id, name, description, active]
    const mockCandidateResponses = [
      [BigInt(1), "Alice Johnson", "Community leader with 10 years of experience", true],
      [BigInt(2), "Bob Smith", "Tech entrepreneur focused on digital innovation", true], 
      [BigInt(3), "Carol Davis", "Environmental advocate and sustainability expert", true],
      [BigInt(4), "David Wilson", "Education reformer and former school principal", true]
    ];

    // Mock the readContract calls
    mockClient.readContract
      .mockResolvedValueOnce(mockCandidateCount) // candidateCount() call
      .mockResolvedValueOnce(mockCandidateResponses[0]) // candidates(1)
      .mockResolvedValueOnce(mockCandidateResponses[1]) // candidates(2)
      .mockResolvedValueOnce(mockCandidateResponses[2]) // candidates(3)
      .mockResolvedValueOnce(mockCandidateResponses[3]); // candidates(4)

    // Test the ACTUAL function
    const electionAddress = "0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83" as `0x${string}`;
    const candidates = await loadElectionCandidates(electionAddress, mockClient);

    // Verify the results
    expect(candidates).toHaveLength(4);
    expect(candidates[0]).toEqual({
      id: BigInt(1),
      name: "Alice Johnson",
      description: "Community leader with 10 years of experience",
      active: true
    });
    expect(candidates[1]).toEqual({
      id: BigInt(2),
      name: "Bob Smith",
      description: "Tech entrepreneur focused on digital innovation",
      active: true
    });
    expect(candidates[2]).toEqual({
      id: BigInt(3),
      name: "Carol Davis",
      description: "Environmental advocate and sustainability expert",
      active: true
    });
    expect(candidates[3]).toEqual({
      id: BigInt(4),
      name: "David Wilson",
      description: "Education reformer and former school principal",
      active: true
    });

    // Verify NO candidates have empty names (this catches the array vs object bug)
    candidates.forEach((candidate, index) => {
      expect(candidate.name).toBeTruthy();
      expect(candidate.name).not.toBe("");
      expect(candidate.description).toBeTruthy();
      expect(candidate.description).not.toBe("");
    });
  });

  it('should handle empty election (0 candidates)', async () => {
    mockClient.readContract.mockResolvedValueOnce(BigInt(0)); // candidateCount = 0

    const electionAddress = "0xtest" as `0x${string}`;
    const candidates = await loadElectionCandidates(electionAddress, mockClient);

    expect(candidates).toHaveLength(0);
    expect(candidates).toEqual([]);
  });

  it('should handle contract errors', async () => {
    mockClient.readContract.mockRejectedValueOnce(new Error("Contract call failed"));

    const electionAddress = "0xtest" as `0x${string}`;
    
    await expect(loadElectionCandidates(electionAddress, mockClient))
      .rejects.toThrow("Contract call failed");
  });

  it('should handle malformed candidate data gracefully', async () => {
    // Test with malformed candidate response (missing fields)
    mockClient.readContract
      .mockResolvedValueOnce(BigInt(2)) // candidateCount = 2
      .mockResolvedValueOnce([BigInt(1), "Alice", "Description 1", true]) // Normal candidate
      .mockResolvedValueOnce([BigInt(2)]); // Malformed candidate (missing name/description)

    const electionAddress = "0xtest" as `0x${string}`;
    const candidates = await loadElectionCandidates(electionAddress, mockClient);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toEqual({
      id: BigInt(1),
      name: "Alice",
      description: "Description 1",
      active: true
    });
    expect(candidates[1]).toEqual({
      id: BigInt(2),
      name: "", // Should fallback to empty string
      description: "", // Should fallback to empty string
      active: false // Should fallback to false for undefined
    });
  });

  it('should verify the exact contract calls made', async () => {
    mockClient.readContract
      .mockResolvedValueOnce(BigInt(2))
      .mockResolvedValueOnce([BigInt(1), "Alice", "Desc 1", true])
      .mockResolvedValueOnce([BigInt(2), "Bob", "Desc 2", true]);

    const electionAddress = "0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83" as `0x${string}`;
    await loadElectionCandidates(electionAddress, mockClient);

    // Verify the exact calls made
    expect(mockClient.readContract).toHaveBeenCalledTimes(3);
    
    // First call: candidateCount()
    expect(mockClient.readContract).toHaveBeenNthCalledWith(1, {
      address: electionAddress,
      abi: expect.any(Array), // ELECTION_ABI
      functionName: 'candidateCount',
    });

    // Second call: candidates(1)
    expect(mockClient.readContract).toHaveBeenNthCalledWith(2, {
      address: electionAddress,
      abi: expect.any(Array), // ELECTION_ABI
      functionName: 'candidates',
      args: [BigInt(1)],
    });

    // Third call: candidates(2)
    expect(mockClient.readContract).toHaveBeenNthCalledWith(3, {
      address: electionAddress,
      abi: expect.any(Array), // ELECTION_ABI
      functionName: 'candidates',
      args: [BigInt(2)],
    });
  });
});
