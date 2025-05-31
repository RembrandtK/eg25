"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
import { createPublicClient, http } from "viem";
import { worldchainSepolia } from "viem/chains";
import { CURRENT_NETWORK } from "@/config/contracts";

interface UseElectionVotingProps {
  electionAddress: string;
  electionAbi: readonly any[];
  onSuccess?: (txId: string) => void;
  onError?: (error: Error) => void;
}

interface RankingEntry {
  candidateId: number;
  tiedWithPrevious: boolean;
}

export function useElectionVoting({
  electionAddress,
  electionAbi,
  onSuccess,
  onError
}: UseElectionVotingProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [currentVote, setCurrentVote] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  // Create public client for reading contract state
  const publicClient = createPublicClient({
    chain: worldchainSepolia,
    transport: http(CURRENT_NETWORK.rpcUrl, {
      retryCount: 3,
      retryDelay: 2000,
    }),
  });

  // Load current vote from contract
  const loadCurrentVote = useCallback(async (retryCount = 0) => {
    if (!session?.user?.address) {
      setIsLoading(false);
      return;
    }

    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);

    try {
      console.log(`📖 Loading current vote from Election contract for: ${session.user.address}`);

      // For Election contract, we need to get the vote using the voter's nullifier hash
      // Since we don't have the nullifier hash in the frontend, we'll need to implement
      // a different approach or store the vote locally until we have proper integration
      
      // For now, start with empty vote
      setCurrentVote([]);
      setIsLoading(false);
    } catch (error) {
      console.error(`Error loading vote (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        setTimeout(() => {
          loadCurrentVote(retryCount + 1);
        }, retryDelay);
      } else {
        console.error("Failed to load vote after all retries");
        setCurrentVote([]);
        setIsLoading(false);
      }
    }
  }, [session?.user?.address, electionAddress, electionAbi, publicClient]);

  // Load vote on mount and when session changes
  useEffect(() => {
    loadCurrentVote();
  }, [loadCurrentVote]);

  // World ID verification function
  const verifyVoteAction = useCallback(async (rankedCandidateIds: bigint[]) => {
    if (!MiniKit.isInstalled()) {
      throw new Error("MiniKit is not installed");
    }

    console.log("🔐 Starting World ID verification for vote...");

    // Create signal from vote data
    const voteData = rankedCandidateIds.map(id => Number(id));
    const signal = JSON.stringify(voteData);

    const verifyPayload: VerifyCommandInput = {
      action: "vote", // This should match the Election contract's worldIdAction
      signal,
      verification_level: VerificationLevel.Orb,
    };

    console.log("📡 Sending verification request:", verifyPayload);

    const verifyResponse = await MiniKit.commandsAsync.verify(verifyPayload);
    console.log("📦 Verification response:", verifyResponse);

    if (verifyResponse.finalPayload.status === "error") {
      const errorMessage = `World ID verification failed: ${verifyResponse.finalPayload.error_code || 'unknown_error'}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const { verification_level, merkle_root, nullifier_hash, proof } = verifyResponse.finalPayload as ISuccessResult;
    
    console.log("✅ World ID verification successful");
    return {
      signal: signal,
      root: merkle_root,
      nullifierHash: nullifier_hash,
      proof: proof,
      verificationLevel: verification_level
    };
  }, []);

  // Submit vote to Election contract
  const submitVote = useCallback(async (rankedCandidateIds: bigint[]) => {
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

    if (rankedCandidateIds.length === 0) {
      console.error("No candidates ranked");
      onError?.(new Error("No candidates ranked"));
      return;
    }

    try {
      setIsVoting(true);

      // Step 1: World ID verification
      console.log("🔐 Starting World ID verification...");
      const worldIdProof = await verifyVoteAction(rankedCandidateIds);

      // Step 2: Convert to RankingEntry format for Election contract
      const rankingEntries: RankingEntry[] = rankedCandidateIds.map(id => ({
        candidateId: Number(id),
        tiedWithPrevious: false  // No ties for now
      }));

      console.log("🚀 Submitting vote to Election contract...");
      console.log("📋 Vote data:", rankingEntries);

      // Step 3: Submit transaction with World ID proof
      const transactionConfig = {
        transaction: [
          {
            address: electionAddress,
            abi: electionAbi,
            functionName: "vote",
            args: [
              worldIdProof.signal,
              worldIdProof.root,
              worldIdProof.nullifierHash,
              worldIdProof.proof,
              rankingEntries
            ],
          },
        ],
      };

      console.log("📡 Sending transaction config:", transactionConfig);

      const result = await MiniKit.commandsAsync.sendTransaction(transactionConfig);
      console.log("📦 Transaction result:", result);

      const { finalPayload } = result;

      if (finalPayload.status === "error") {
        console.error("Error submitting vote:", finalPayload);
        const errorCode = (finalPayload as any).error_code || 'unknown_error';
        const errorMessage = errorCode === 'user_rejected'
          ? 'Transaction was rejected. Please try again.'
          : `Transaction failed: ${errorCode}`;
        onError?.(new Error(errorMessage));
        return;
      }

      console.log("Vote submitted successfully:", finalPayload);
      setLastTxId(finalPayload.transaction_id);
      setCurrentVote(rankedCandidateIds);

      // Reload vote from blockchain to confirm
      setTimeout(() => {
        loadCurrentVote();
      }, 3000);

      onSuccess?.(finalPayload.transaction_id);
    } catch (error) {
      console.error("Error submitting vote:", error);
      onError?.(error instanceof Error ? error : new Error('Unknown error occurred'));
    } finally {
      setIsVoting(false);
    }
  }, [electionAddress, electionAbi, session?.user?.address, onSuccess, onError, verifyVoteAction, loadCurrentVote]);

  return {
    // State
    isVoting,
    isLoading,
    currentVote,
    lastTxId,
    
    // Actions
    submitVote,
    loadCurrentVote,
    
    // Utilities
    hasVoted: currentVote.length > 0,
  };
}
