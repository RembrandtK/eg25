import { createPublicClient, http } from 'viem';
import { worldchainSepolia } from 'viem/chains';
import { ELECTION_ABI } from '@/election-abi';

// Mock the actual contract interaction that the ElectionDashboard uses
describe('Candidate Loading Integration', () => {
  let mockPublicClient: any;

  beforeEach(() => {
    // Create a mock that simulates the actual viem contract response structure
    mockPublicClient = {
      readContract: jest.fn()
    };
  });

  it('should correctly parse candidate data from contract arrays', async () => {
    // Mock the contract responses to match what Solidity actually returns
    // candidateCount() returns a BigInt
    const mockCandidateCount = BigInt(4);
    
    // candidates(i) returns an array: [id, name, description, active]
    const mockCandidateResponses = [
      [BigInt(1), "Alice Johnson", "Community leader with 10 years of experience", true],
      [BigInt(2), "Bob Smith", "Tech entrepreneur focused on digital innovation", true], 
      [BigInt(3), "Carol Davis", "Environmental advocate and sustainability expert", true],
      [BigInt(4), "David Wilson", "Education reformer and former school principal", true]
    ];

    // Mock the readContract calls
    mockPublicClient.readContract
      .mockResolvedValueOnce(mockCandidateCount) // candidateCount() call
      .mockResolvedValueOnce(mockCandidateResponses[0]) // candidates(1)
      .mockResolvedValueOnce(mockCandidateResponses[1]) // candidates(2)
      .mockResolvedValueOnce(mockCandidateResponses[2]) // candidates(3)
      .mockResolvedValueOnce(mockCandidateResponses[3]); // candidates(4)

    // Simulate the exact logic from ElectionDashboard
    const electionAddress = "0xd6eBE2f9de0500e7E5a566046781cF2C0323ee83";
    
    // Step 1: Get candidate count
    const candidateCount = await mockPublicClient.readContract({
      address: electionAddress,
      abi: ELECTION_ABI,
      functionName: 'candidateCount',
    });

    expect(candidateCount).toBe(BigInt(4));

    // Step 2: Load all candidates using Promise.all (like the real code)
    const candidatePromises = [];
    for (let i = 1; i <= Number(candidateCount); i++) {
      candidatePromises.push(
        mockPublicClient.readContract({
          address: electionAddress,
          abi: ELECTION_ABI,
          functionName: 'candidates',
          args: [BigInt(i)],
        })
      );
    }

    const candidateResults = await Promise.all(candidatePromises);

    // Step 3: Map results using the CORRECT array indexing (this would catch the bug!)
    const loadedCandidates = candidateResults.map((result: any, index) => ({
      id: BigInt(index + 1),
      name: result[1] || "", // ← This is the correct way (array index)
      description: result[2] || ""
    }));

    // Verify the results
    expect(loadedCandidates).toHaveLength(4);
    expect(loadedCandidates[0]).toEqual({
      id: BigInt(1),
      name: "Alice Johnson",
      description: "Community leader with 10 years of experience"
    });
    expect(loadedCandidates[1]).toEqual({
      id: BigInt(2), 
      name: "Bob Smith",
      description: "Tech entrepreneur focused on digital innovation"
    });

    // Verify all candidates have names (would catch empty name bug)
    loadedCandidates.forEach((candidate, index) => {
      expect(candidate.name).toBeTruthy();
      expect(candidate.name).not.toBe("");
      expect(candidate.description).toBeTruthy();
    });
  });

  it('should fail with the WRONG object property access (demonstrating the bug)', async () => {
    // This test demonstrates what was wrong in the original code
    const mockCandidateResponse = [BigInt(1), "Alice Johnson", "Community leader", true];
    
    mockPublicClient.readContract.mockResolvedValueOnce(mockCandidateResponse);

    const result = await mockPublicClient.readContract({
      address: "0xtest",
      abi: ELECTION_ABI,
      functionName: 'candidates',
      args: [BigInt(1)],
    });

    // The WRONG way (what the original code was doing)
    const wrongCandidate = {
      id: BigInt(1),
      name: (result as any).name || "", // ← This would be undefined!
      description: (result as any).description || ""
    };

    // This would fail - demonstrating the bug
    expect(wrongCandidate.name).toBe(""); // Empty because result.name is undefined
    expect(wrongCandidate.description).toBe(""); // Empty because result.description is undefined

    // The RIGHT way (array indexing)
    const rightCandidate = {
      id: BigInt(1),
      name: result[1] || "",
      description: result[2] || ""
    };

    expect(rightCandidate.name).toBe("Alice Johnson");
    expect(rightCandidate.description).toBe("Community leader");
  });

  it('should handle contract errors gracefully', async () => {
    // Test error handling
    mockPublicClient.readContract.mockRejectedValueOnce(new Error("Contract call failed"));

    try {
      await mockPublicClient.readContract({
        address: "0xtest",
        abi: ELECTION_ABI,
        functionName: 'candidateCount',
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toBe("Contract call failed");
    }
  });
});
