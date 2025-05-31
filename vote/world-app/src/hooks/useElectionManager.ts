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

  // Load all elections from ElectionManager
  const loadElections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("📖 Loading elections from ElectionManager...");

      // Get election count
      const electionCount = await publicClient.readContract({
        address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
        abi: ELECTION_MANAGER_ABI,
        functionName: "getElectionCount",
      }) as bigint;

      console.log(`Found ${electionCount} elections`);

      if (electionCount === 0n) {
        setElections([]);
        setIsLoading(false);
        return;
      }

      // Load each election's details
      const electionPromises = [];
      for (let i = 0n; i < electionCount; i++) {
        electionPromises.push(
          publicClient.readContract({
            address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
            abi: ELECTION_MANAGER_ABI,
            functionName: "elections",
            args: [i],
          })
        );
      }

      const electionResults = await Promise.all(electionPromises);
      
      // Transform results into Election objects
      const loadedElections: Election[] = electionResults.map((result: any, index) => {
        // The result should be a tuple from the elections mapping
        // Based on the ElectionManager contract structure
        return {
          id: BigInt(index),
          address: result[0] || "", // election contract address
          name: result[1] || `Election ${index + 1}`, // name
          description: result[2] || "", // description
          worldIdAction: result[3] || "vote", // worldIdAction
          candidateCount: Number(result[4] || 0), // candidate count
          isActive: Boolean(result[5]), // isActive
          creator: result[6] || "", // creator address
        };
      });

      console.log("📋 Loaded elections:", loadedElections);
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
    if (enabled) {
      loadElections();
    } else {
      setElections([]);
      setIsLoading(false);
      setError(null);
    }
  }, [enabled]); // Remove loadElections from dependencies to prevent infinite loop

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
