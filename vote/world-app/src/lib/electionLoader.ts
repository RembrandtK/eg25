import { createPublicClient, http } from 'viem';
import { ELECTION_MANAGER_ABI } from '@/election-manager-abi';
import { CURRENT_NETWORK } from '@/config/contracts';

export interface Election {
  id: bigint;
  title: string;
  electionAddress: string;
  worldIdAction: string;
  candidateCount: bigint;
  isActive: boolean;
}

/**
 * Loads elections from the ElectionManager contract
 * This is the EXACT function the app uses - extracted for testing
 */
export async function loadElections(
  publicClient?: any // Allow injection for testing
): Promise<Election[]> {
  // Use provided client or create default one
  const client = publicClient || createPublicClient({
    chain: CURRENT_NETWORK.chain,
    transport: http(CURRENT_NETWORK.rpcUrl)
  });

  try {
    // Call getAllElections() on the ElectionManager contract
    const allElections = await client.readContract({
      address: CURRENT_NETWORK.electionManagerAddress as `0x${string}`,
      abi: ELECTION_MANAGER_ABI,
      functionName: 'getAllElections',
    });

    // Map the results to Election objects
    // Need to check what structure getAllElections() actually returns
    const elections: Election[] = allElections.map((election: any, index: number) => {
      // This mapping depends on the actual structure returned by getAllElections()
      // It might be an array of arrays, or an array of objects
      return {
        id: BigInt(index + 1),
        title: election.title || election[1] || "", // Handle both object and array formats
        electionAddress: election.electionAddress || election[0] || "",
        worldIdAction: election.worldIdAction || election[2] || "",
        candidateCount: election.candidateCount || election[3] || BigInt(0),
        isActive: election.isActive || election[4] || false
      };
    });

    return elections;
  } catch (error) {
    console.error("Error loading elections:", error);
    throw error;
  }
}

/**
 * Checks if a user has voted in a specific election
 * This is the EXACT function the app uses for vote status checking
 */
export async function checkVoteStatus(
  electionAddress: `0x${string}`,
  userAddress: `0x${string}`,
  publicClient?: any
): Promise<boolean> {
  const client = publicClient || createPublicClient({
    chain: CURRENT_NETWORK.chain,
    transport: http(CURRENT_NETWORK.rpcUrl)
  });

  try {
    const hasVoted = await client.readContract({
      address: electionAddress,
      abi: [], // Need to import Election ABI
      functionName: 'hasVoted',
      args: [userAddress],
    });

    return Boolean(hasVoted);
  } catch (error) {
    console.error("Error checking vote status:", error);
    throw error;
  }
}
