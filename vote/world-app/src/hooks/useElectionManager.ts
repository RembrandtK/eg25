"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createPublicClient, http } from "viem";
import { worldchainSepolia } from "viem/chains";
import { CURRENT_NETWORK, ELECTION_MANAGER_ADDRESS } from "@/config/contracts";
import { ELECTION_MANAGER_ABI } from "@/election-manager-abi";

interface Election {
  id: bigint;
  address: string;
  name: string;
  description: string;
  worldIdAction: string;
  candidateCount: number;
  isActive: boolean;
  creator: string;
}

interface UseElectionManagerOptions {
  enabled?: boolean;
}

export function useElectionManager(options: UseElectionManagerOptions = {}) {
  const { enabled = true } = options;
  console.log("🔧 useElectionManager hook called with enabled:", enabled);
  console.log("🔧 useElectionManager: Hook is executing!");

  const [elections, setElections] = useState<Election[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  // Create public client for reading contract state (memoized to prevent infinite loops)
  const publicClient = useMemo(() => createPublicClient({
    chain: worldchainSepolia,
    transport: http(CURRENT_NETWORK.rpcUrl, {
      retryCount: 3,
      retryDelay: 2000,
    }),
  }), []);

  // Load all elections from ElectionManager using getAllElections()
  const loadElections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("📖 Loading elections from ElectionManager using getAllElections()...");

      // Use the getAllElections() function which is simpler and more reliable
      const allElections = await publicClient.readContract({
        address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
        abi: ELECTION_MANAGER_ABI,
        functionName: "getAllElections",
      }) as any[];

      console.log("🔍 Raw election results from getAllElections():", allElections);

      if (allElections.length === 0) {
        console.log("No elections found");
        setElections([]);
        setIsLoading(false);
        return;
      }

      // Transform results into Election objects
      const loadedElections: Election[] = allElections.map((result: any, index) => {
        console.log(`🔍 Processing election ${index + 1}:`, result);

        // The result is an ElectionInfo struct:
        // (id, title, description, worldIdAction, creator, electionAddress, createdAt, active)
        const election = {
          id: result.id,
          address: result.electionAddress, // election contract address
          name: result.title, // title
          description: result.description, // description
          worldIdAction: result.worldIdAction, // worldIdAction
          candidateCount: 0, // We'll get this from the Election contract if needed
          isActive: Boolean(result.active), // active status
          creator: result.creator, // creator address
        };

        console.log(`✅ Transformed election ${index + 1}:`, election);
        return election;
      });

      console.log("📋 Final loaded elections:", loadedElections);
      setElections(loadedElections);
    } catch (error) {
      console.error("Error loading elections:", error);
      setError(error instanceof Error ? error.message : "Failed to load elections");
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  // Get specific election by ID
  const getElection = useCallback((electionId: bigint): Election | undefined => {
    return elections.find(election => election.id === electionId);
  }, [elections]);

  // Get active elections
  const getActiveElections = useCallback((): Election[] => {
    return elections.filter(election => election.isActive);
  }, [elections]);

  // Load elections when enabled
  useEffect(() => {
    console.log("🔧 useElectionManager useEffect triggered:", { enabled });
    if (enabled) {
      console.log("🔧 useElectionManager: calling loadElections()");
      loadElections();
    } else {
      console.log("🔧 useElectionManager: disabled, clearing elections");
      setElections([]);
      setIsLoading(false);
      setError(null);
    }
  }, [enabled, loadElections]); // Include loadElections in dependencies

  return {
    // State
    elections,
    isLoading,
    error,
    
    // Actions
    loadElections,
    
    // Utilities
    getElection,
    getActiveElections,
    hasElections: elections.length > 0,
    activeElectionCount: elections.filter(e => e.isActive).length,
  };
}
