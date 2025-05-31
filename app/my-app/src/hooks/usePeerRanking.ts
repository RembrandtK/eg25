"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
import { createPublicClient, http } from "viem";
import { worldchainSepolia } from "viem/chains";

interface UsePeerRankingProps {
  contractAddress: string;
  contractAbi: readonly any[];
  onSuccess?: (txId: string) => void;
  onError?: (error: Error) => void;
}

export function usePeerRanking({
  contractAddress,
  contractAbi,
  onSuccess,
  onError
}: UsePeerRankingProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [currentRanking, setCurrentRanking] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  // Create public client for reading contract state
  const publicClient = createPublicClient({
    chain: worldchainSepolia,
    transport: http(),
  });

  // Load current ranking from contract
  const loadCurrentRanking = useCallback(async () => {
    if (!session?.user?.address) {
      setIsLoading(false);
      return;
    }

    try {
      console.log("📖 Loading current ranking from contract for:", session.user.address);

      const ranking = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: contractAbi,
        functionName: 'getUserRanking',
        args: [session.user.address],
      }) as bigint[];

      console.log("📖 Loaded ranking:", ranking);
      setCurrentRanking(ranking || []);
    } catch (error) {
      console.error("Error loading current ranking:", error);
      // Don't treat this as a fatal error - user might not have ranked yet
      setCurrentRanking([]);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, contractAbi, session?.user?.address, publicClient]);

  // Load ranking when user address changes
  useEffect(() => {
    loadCurrentRanking();
  }, [loadCurrentRanking]);

  // Debounce rapid ranking changes
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRankingRef = useRef<bigint[] | null>(null);

  const updateRanking = useCallback(async (rankedCandidateIds: bigint[]) => {
    if (!MiniKit.isInstalled()) {
      console.error("MiniKit is not installed");
      onError?.(new Error("MiniKit is not installed"));
      return;
    }

    if (!session?.user?.address) {
      console.error("User not authenticated");
      onError?.(new Error("User not authenticated"));
      return;
    }

    // Store the pending ranking
    pendingRankingRef.current = rankedCandidateIds;

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates to avoid too many blockchain transactions
    updateTimeoutRef.current = setTimeout(async () => {
      const rankingToUpdate = pendingRankingRef.current;
      if (!rankingToUpdate) return;

      try {
        setIsUpdating(true);

        // Convert BigInt array to regular number array for the contract call
        const candidateIdsAsNumbers = rankingToUpdate.map(id => Number(id));

        console.log("Updating peer ranking with:", candidateIdsAsNumbers);

        // Send debug info to server
        await fetch("/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "PeerRanking: Attempting transaction",
            data: JSON.stringify({
              contractAddress,
              functionName: "updateRanking",
              args: candidateIdsAsNumbers,
              miniKitInstalled: MiniKit.isInstalled()
            }, null, 2)
          }),
        }).catch(() => {});

        // Check if MiniKit is available for actual transaction
        if (!MiniKit.isInstalled()) {
          // Development mode: simulate transaction
          console.log("Development mode: Simulating transaction (MiniKit not available)");
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
          const mockTxId = `dev_tx_${Date.now()}`;
          setLastTxId(mockTxId);
          onSuccess?.(mockTxId);
          return;
        }

        // For now, let's simulate the transaction to test the UI flow
        console.log("🚀 Simulating transaction for testing...");
        console.log("📋 Would call updateRanking with:", candidateIdsAsNumbers);

        // Simulate a quick successful transaction (reduced delay for better UX)
        await new Promise(resolve => setTimeout(resolve, 300));
        const mockTxId = `mock_tx_${Date.now()}`;
        setLastTxId(mockTxId);
        onSuccess?.(mockTxId);

        console.log("✅ Mock transaction completed:", mockTxId);
        return;

        // TODO: Re-enable real transactions once we figure out the MiniKit issues
        /*
        const transactionConfig = {
          transaction: [
            {
              address: contractAddress,
              abi: contractAbi,
              functionName: "updateRanking",
              args: [candidateIdsAsNumbers],
            },
          ],
        };

        console.log("📋 Transaction config:", JSON.stringify(transactionConfig, null, 2));

        const result = await MiniKit.commandsAsync.sendTransaction(transactionConfig);
        console.log("📦 Raw MiniKit result:", result);

        const { finalPayload } = result;
        */

        // Log transaction result
        await fetch("/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "PeerRanking: Transaction result",
            data: JSON.stringify({
              status: finalPayload.status,
              transaction_id: finalPayload.transaction_id,
              error_message: finalPayload.error_message
            }, null, 2)
          }),
        }).catch(() => {});

        if (finalPayload.status === "error") {
          console.error("Error updating ranking:", finalPayload);
          onError?.(new Error(`Transaction failed: ${finalPayload.error_message || 'Unknown error'}`));
          return;
        }

        console.log("Ranking updated successfully:", finalPayload);
        setLastTxId(finalPayload.transaction_id);
        onSuccess?.(finalPayload.transaction_id);
      } catch (error) {
        console.error("Error updating ranking:", error);
        onError?.(error instanceof Error ? error : new Error('Unknown error occurred'));
      } finally {
        setIsUpdating(false);
        pendingRankingRef.current = null;
      }
    }, 800); // 0.8 second debounce for better responsiveness
  }, [contractAddress, contractAbi, session?.user?.address, onSuccess, onError]);

  // Immediate update (no debounce) for critical actions
  const updateRankingImmediate = useCallback(async (rankedCandidateIds: bigint[]) => {
    // Clear any pending debounced update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    if (!MiniKit.isInstalled()) {
      console.error("MiniKit is not installed");
      onError?.(new Error("MiniKit is not installed"));
      return;
    }

    if (!session?.user?.address) {
      console.error("User not authenticated");
      onError?.(new Error("User not authenticated"));
      return;
    }

    try {
      setIsUpdating(true);

      // Convert BigInt array to regular number array for the contract call
      const candidateIdsAsNumbers = rankedCandidateIds.map(id => Number(id));

      console.log("Immediately updating peer ranking with:", candidateIdsAsNumbers);

      // Send debug info to server
      await fetch("/api/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "PeerRanking: Immediate transaction attempt",
          data: JSON.stringify({
            contractAddress,
            functionName: "updateRanking",
            args: candidateIdsAsNumbers,
            miniKitInstalled: MiniKit.isInstalled()
          }, null, 2)
        }),
      }).catch(() => {});

      // Check if MiniKit is available for actual transaction
      if (!MiniKit.isInstalled()) {
        // Development mode: simulate transaction
        console.log("Development mode: Simulating immediate transaction (MiniKit not available)");
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
        const mockTxId = `dev_tx_immediate_${Date.now()}`;
        setLastTxId(mockTxId);
        onSuccess?.(mockTxId);
        return;
      }

      // Simulate immediate transaction for testing
      console.log("🚀 Simulating immediate transaction for testing...");
      console.log("📋 Would call updateRanking immediately with:", candidateIdsAsNumbers);

      // Simulate a quick successful transaction
      await new Promise(resolve => setTimeout(resolve, 300));
      const mockTxId = `mock_immediate_tx_${Date.now()}`;
      setLastTxId(mockTxId);
      onSuccess?.(mockTxId);

      console.log("✅ Mock immediate transaction completed:", mockTxId);
      return;

      if (finalPayload.status === "error") {
        console.error("Error updating ranking:", finalPayload);
        onError?.(new Error(`Transaction failed: ${finalPayload.error_message || 'Unknown error'}`));
        return;
      }

      console.log("Ranking updated successfully:", finalPayload);
      setLastTxId(finalPayload.transaction_id);
      onSuccess?.(finalPayload.transaction_id);
    } catch (error) {
      console.error("Error updating ranking:", error);
      onError?.(error instanceof Error ? error : new Error('Unknown error occurred'));
    } finally {
      setIsUpdating(false);
    }
  }, [contractAddress, contractAbi, session?.user?.address, onSuccess, onError]);

  // Cancel any pending updates
  const cancelPendingUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
      pendingRankingRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    cancelPendingUpdate();
  }, [cancelPendingUpdate]);

  // Debug logging
  const miniKitInstalled = MiniKit.isInstalled();
  const hasUserAddress = !!session?.user?.address;

  // For development: allow testing without MiniKit if we have a user session
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isReady = hasUserAddress && (miniKitInstalled || isDevelopment);

  // Log connection status for debugging (only when values change)
  useEffect(() => {
    console.log('PeerRanking Hook Status:', {
      hasUserAddress,
      userAddress: session?.user?.address,
      miniKitInstalled,
      isDevelopment,
      isReady
    });
  }, [hasUserAddress, session?.user?.address, miniKitInstalled, isDevelopment, isReady]);

  return {
    updateRanking,
    updateRankingImmediate,
    cancelPendingUpdate,
    cleanup,
    loadCurrentRanking,
    isUpdating,
    isLoading,
    lastTxId,
    currentRanking,
    isReady,
    // Debug info
    hasUserAddress,
    miniKitInstalled
  };
}
