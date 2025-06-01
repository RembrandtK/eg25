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

  // Debug API call to confirm hook is being called
  fetch('/api/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `🔧 useElectionManager: Hook called with enabled=${enabled}`,
      data: { enabled }
    })
  });

  const [elections, setElections] = useState<Election[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  // Create public client for reading contract state (memoized to prevent infinite loops)
  const publicClient = useMemo(() => {
    console.log("🔧 Creating public client with RPC URL:", CURRENT_NETWORK.rpcUrl);
    console.log("🔧 Full CURRENT_NETWORK config:", CURRENT_NETWORK);

    return createPublicClient({
      chain: worldchainSepolia,
      transport: http(CURRENT_NETWORK.rpcUrl, {
        retryCount: 3,
        retryDelay: 2000,
      }),
    });
  }, []);

  // Load all elections from ElectionManager using getAllElections()
  const loadElections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("📖 Loading elections from ElectionManager using getAllElections()...");

      // Debug API call to track election loading
      await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `📖 useElectionManager: Starting getAllElections() call`,
          data: {
            electionManagerAddress: ELECTION_MANAGER_ADDRESS,
            expectedAddress: "0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC",
            addressMatch: ELECTION_MANAGER_ADDRESS === "0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC"
          }
        })
      });

      // Debug: Log the actual address being used
      console.log("🔍 ELECTION_MANAGER_ADDRESS being used:", ELECTION_MANAGER_ADDRESS);
      console.log("🔍 Expected address: 0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC");
      console.log("🔍 Address match:", ELECTION_MANAGER_ADDRESS === "0x2A43763e2cB8Fd417Df3236bAE24b1590E6bD5EC");

      // Use the getAllElections() function which is simpler and more reliable
      const allElections = await publicClient.readContract({
        address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
        abi: ELECTION_MANAGER_ABI,
        functionName: "getAllElections",
      }) as any[];

      console.log("🔍 Raw election results from getAllElections():", allElections);

      // Debug API call for contract response
      await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `📖 useElectionManager: getAllElections() returned ${allElections.length} elections`,
          data: {
            electionCount: allElections.length,
            firstElection: allElections.length > 0 ? {
              id: allElections[0].id?.toString(),
              title: allElections[0].title,
              electionAddress: allElections[0].electionAddress
            } : null
          }
        })
      });

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
