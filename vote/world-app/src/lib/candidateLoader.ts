import { createPublicClient, http } from 'viem';
import { ELECTION_ABI } from '@/election-abi';
import { CURRENT_NETWORK } from '@/config/contracts';

export interface Candidate {
  id: bigint;
  name: string;
  description: string;
}

/**
 * Loads candidates from an election contract
 * This is the EXACT function the app uses - extracted for testing
 */
export async function loadElectionCandidates(
  electionAddress: `0x${string}`,
  publicClient?: any // Allow injection for testing
): Promise<Candidate[]> {
  // Use provided client or create default one
  const client = publicClient || createPublicClient({
    chain: CURRENT_NETWORK.chain,
    transport: http(CURRENT_NETWORK.rpcUrl)
  });

  try {
    // Step 1: Get candidate count
    const candidateCount = await client.readContract({
      address: electionAddress,
      abi: ELECTION_ABI,
      functionName: 'candidateCount',
    });

    if (Number(candidateCount) === 0) {
      return [];
    }

    // Step 2: Load all candidates using Promise.all
    const candidatePromises = [];
    for (let i = 1; i <= Number(candidateCount); i++) {
      candidatePromises.push(
        client.readContract({
          address: electionAddress,
          abi: ELECTION_ABI,
          functionName: 'candidates',
          args: [BigInt(i)],
        })
      );
    }

    const candidateResults = await Promise.all(candidatePromises);

    // Step 3: Map results to candidate objects
    const loadedCandidates: Candidate[] = candidateResults.map((result: any, index) => {
      // Solidity returns arrays, not objects
      // result[0] = id, result[1] = name, result[2] = description, result[3] = active
      return {
        id: BigInt(index + 1),
        name: result[1] || "", // Access by array index, not property name
        description: result[2] || ""
      };
    });

    return loadedCandidates;
  } catch (error) {
    console.error("Error loading candidates:", error);
    throw error;
  }
}

/**
 * Loads elections from the ElectionManager contract
 * This is the EXACT function the app uses for election loading
 */
export async function loadElections(publicClient?: any) {
  // Implementation would go here - extracted from useElectionManager
  // For now, focusing on candidate loading
  throw new Error("Not implemented yet - focus on candidate loading first");
}
