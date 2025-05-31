"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
import { createPublicClient, http } from "viem";
import { worldchainSepolia } from "viem/chains";
import { CURRENT_NETWORK } from "@/config/contracts";

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

  // Create public client for reading contract state with retry logic
  const publicClient = createPublicClient({
    chain: worldchainSepolia,
    transport: http(CURRENT_NETWORK.rpcUrl, {
      retryCount: 3,
      retryDelay: 2000, // 2 second delay between retries
    }),
  });

  // Load current ranking from contract with improved error handling
  const loadCurrentRanking = useCallback(async (retryCount = 0) => {
    if (!session?.user?.address) {
      setIsLoading(false);
      return;
    }

    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s

    try {
      console.log(`📖 Loading current ranking from contract for: ${session.user.address} (attempt ${retryCount + 1}/${maxRetries + 1})`);

      const rankingEntries = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: contractAbi,
        functionName: 'getUserRanking',
        args: [session.user.address],
      }) as Array<{ candidateId: bigint; tiedWithPrevious: boolean }>;

      // Convert RankingEntry[] to simple candidateId array for frontend compatibility
      const ranking = rankingEntries.map(entry => entry.candidateId);

      console.log("📖 Successfully loaded ranking:", ranking);
      setCurrentRanking(ranking || []);
    } catch (error) {
      console.error(`Error loading current ranking (attempt ${retryCount + 1}):`, error);

      // Retry logic for network/RPC errors
      if (retryCount < maxRetries && (
        error instanceof Error && (
          error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('fetch') ||
          error.message.includes('RPC')
        )
      )) {
        console.log(`⏳ Retrying in ${retryDelay}ms...`);
        setTimeout(() => {
          loadCurrentRanking(retryCount + 1);
        }, retryDelay);
        return; // Don't set loading to false yet
      }

      // For other errors or max retries reached, treat as no ranking
      console.log("📝 No existing ranking found or max retries reached, starting fresh");
      setCurrentRanking([]);
    } finally {
      // Only set loading to false if we're not retrying
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

  // World ID verification for voting action - just get the proof for logging
  const verifyVoteAction = useCallback(async (rankedCandidateIds: bigint[]) => {
    if (!MiniKit.isInstalled()) {
      throw new Error("MiniKit is not installed");
    }

    // Create signal with vote data
    const voteSignal = JSON.stringify({
      action: "vote",
      candidateIds: rankedCandidateIds.map(id => id.toString()),
      timestamp: Date.now()
    });

    console.log("Starting World ID verification for vote:", voteSignal);

    const verifyPayload: VerifyCommandInput = {
      action: process.env.NEXT_PUBLIC_WLD_ACTION_ID || "vote",
      signal: voteSignal,
      verification_level: VerificationLevel.Orb,
    };

    const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

    if (finalPayload.status === "error") {
      throw new Error(`World ID verification failed: ${finalPayload.error_code}`);
    }

    console.log("✅ World ID verification successful for vote - proof will be verified on-chain");
    return finalPayload as ISuccessResult;
  }, []);

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

        // Convert BigInt array to RankingEntry array for the new contract structure
        const rankingEntries = rankingToUpdate.map(id => ({
          candidateId: Number(id),
          tiedWithPrevious: false  // For now, no ties in frontend
        }));

        console.log("Updating peer ranking with:", rankingEntries);

        // Send debug info to server
        await fetch("/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "PeerRanking: Attempting transaction",
            data: JSON.stringify({
              contractAddress,
              functionName: "updateRanking",
              args: [rankingEntries], // Match the actual transaction args structure
              miniKitInstalled: MiniKit.isInstalled(),
              userAddress: session?.user?.address,
              sessionData: session?.user
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

        // Step 1: World ID verification with vote data
        console.log("🔐 Starting World ID verification for vote...");
        try {
          await verifyVoteAction(rankingToUpdate);
        } catch (verifyError) {
          console.error("World ID verification failed:", verifyError);
          onError?.(verifyError instanceof Error ? verifyError : new Error('World ID verification failed'));
          return;
        }

        // Step 2: Real transaction with MiniKit
        console.log("🚀 Sending real transaction with MiniKit...");
        console.log("📋 Calling updateRanking with:", rankingEntries);
        const transactionConfig = {
          transaction: [
            {
              address: contractAddress,
              abi: contractAbi,
              functionName: "updateRanking",
              args: [rankingEntries],
            },
          ],
        };

        console.log("📡 Sending transaction config:", transactionConfig);

        const result = await MiniKit.commandsAsync.sendTransaction(transactionConfig);
        console.log("📦 Raw MiniKit result:", result);

        const { finalPayload } = result;

        // Log transaction result
        await fetch("/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "PeerRanking: Transaction result",
            data: JSON.stringify({
              status: finalPayload.status,
              transaction_id: finalPayload.status === "success" ? (finalPayload as any).transaction_id : undefined,
              error_code: finalPayload.status === "error" ? (finalPayload as any).error_code : undefined,
              details: finalPayload.status === "error" ? (finalPayload as any).details : undefined
            }, null, 2)
          }),
        }).catch(() => {});

        if (finalPayload.status === "error") {
          console.error("Error updating ranking:", finalPayload);
          const errorCode = (finalPayload as any).error_code || 'unknown_error';
          const errorMessage = errorCode === 'user_rejected'
            ? 'Transaction was rejected. This might be due to insufficient World ID verification.'
            : `Transaction failed: ${errorCode}`;
          onError?.(new Error(errorMessage));
          return;
        }

        console.log("Ranking updated successfully:", finalPayload);
        setLastTxId(finalPayload.transaction_id);

        // Reload the ranking from the blockchain to confirm it was saved
        setTimeout(() => {
          loadCurrentRanking();
        }, 2000); // Wait 2 seconds for blockchain confirmation

        onSuccess?.(finalPayload.transaction_id);
      } catch (error) {
        console.error("Error updating ranking:", error);
        onError?.(error instanceof Error ? error : new Error('Unknown error occurred'));
      } finally {
        setIsUpdating(false);
        pendingRankingRef.current = null;
      }
    }, 800); // 0.8 second debounce for better responsiveness
  }, [contractAddress, contractAbi, session?.user?.address, onSuccess, onError, verifyVoteAction]);

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

      // Convert BigInt array to RankingEntry array for the new contract structure
      const rankingEntries = rankedCandidateIds.map(id => ({
        candidateId: Number(id),
        tiedWithPrevious: false  // For now, no ties in frontend
      }));

      console.log("Immediately updating peer ranking with:", rankingEntries);

      // Send debug info to server
      await fetch("/api/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "PeerRanking: Immediate transaction attempt",
          data: JSON.stringify({
            contractAddress,
            functionName: "updateRanking",
            args: [rankingEntries], // Match the actual transaction args structure
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

      // Step 1: World ID verification with vote data
      console.log("🔐 Starting World ID verification for immediate vote...");
      try {
        await verifyVoteAction(rankedCandidateIds);
      } catch (verifyError) {
        console.error("World ID verification failed:", verifyError);
        onError?.(verifyError instanceof Error ? verifyError : new Error('World ID verification failed'));
        return;
      }

      // Step 2: Real immediate transaction with MiniKit
      console.log("🚀 Sending immediate real transaction with MiniKit...");
      console.log("📋 Calling updateRanking immediately with:", rankingEntries);

      const transactionConfig = {
        transaction: [
          {
            address: contractAddress,
            abi: contractAbi,
            functionName: "updateRanking",
            args: [rankingEntries],
          },
        ],
      };

      console.log("📡 Sending immediate transaction config:", transactionConfig);

      const result = await MiniKit.commandsAsync.sendTransaction(transactionConfig);
      console.log("📦 Raw immediate MiniKit result:", result);

      const { finalPayload } = result;

      if (finalPayload.status === "error") {
        console.error("Error updating ranking:", finalPayload);
        const errorCode = (finalPayload as any).error_code || 'unknown_error';
        const errorMessage = errorCode === 'user_rejected'
          ? 'Transaction was rejected. This might be due to insufficient World ID verification.'
          : `Transaction failed: ${errorCode}`;
        onError?.(new Error(errorMessage));
        return;
      }

      console.log("Ranking updated successfully:", finalPayload);
      setLastTxId((finalPayload as any).transaction_id);

      // Reload the ranking from the blockchain to confirm it was saved
      setTimeout(() => {
        loadCurrentRanking();
      }, 2000); // Wait 2 seconds for blockchain confirmation

      onSuccess?.((finalPayload as any).transaction_id);
    } catch (error) {
      console.error("Error updating ranking:", error);
      onError?.(error instanceof Error ? error : new Error('Unknown error occurred'));
    } finally {
      setIsUpdating(false);
    }
  }, [contractAddress, contractAbi, session?.user?.address, onSuccess, onError, verifyVoteAction]);

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
