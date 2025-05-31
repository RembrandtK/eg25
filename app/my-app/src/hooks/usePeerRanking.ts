"use client";

import { useState, useCallback, useRef } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();

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

        // Send transaction to update ranking
        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            {
              address: contractAddress,
              abi: contractAbi,
              functionName: "updateRanking",
              args: [candidateIdsAsNumbers],
            },
          ],
        });

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
    }, 1000); // 1 second debounce
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

      // Send transaction to update ranking
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: contractAddress,
            abi: contractAbi,
            functionName: "updateRanking",
            args: [candidateIdsAsNumbers],
          },
        ],
      });

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

  // Log connection status for debugging
  if (typeof window !== 'undefined') {
    console.log('PeerRanking Hook Status:', {
      hasUserAddress,
      userAddress: session?.user?.address,
      miniKitInstalled,
      isDevelopment,
      isReady
    });
  }

  return {
    updateRanking,
    updateRankingImmediate,
    cancelPendingUpdate,
    cleanup,
    isUpdating,
    lastTxId,
    isReady,
    // Debug info
    hasUserAddress,
    miniKitInstalled
  };
}
