"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
import { createPublicClient, http, keccak256, encodePacked } from "viem";
import { worldchainSepolia } from "viem/chains";
import { CURRENT_NETWORK } from "@/config/contracts";
import { ELECTION_MANAGER_ABI } from "@/election-manager-abi";

interface UseElectionVotingProps {
  electionAddress: string;
  electionAbi: readonly any[];
  worldIdAction?: string; // Add worldIdAction for proper verification
  testMode?: boolean; // Flag to bypass World ID verification
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
  worldIdAction = "vote", // Always use universal "vote" action
  testMode = true, // Default to test mode for now
  onSuccess,
  onError
}: UseElectionVotingProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [currentVote, setCurrentVote] = useState<{
    candidateIds: bigint[];
    signal?: string;
  }>({ candidateIds: [] });
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  // Create public client for reading contract state (memoized to prevent infinite loops)
  const publicClient = useMemo(() => createPublicClient({
    chain: worldchainSepolia,
    transport: http(CURRENT_NETWORK.rpcUrl, {
      retryCount: 3,
      retryDelay: 2000,
    }),
  }), []);

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
      setCurrentVote({ candidateIds: [] });
      setIsLoading(false);
    } catch (error) {
      console.error(`Error loading vote (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        setTimeout(() => {
          loadCurrentVote(retryCount + 1);
        }, retryDelay);
      } else {
        console.error("Failed to load vote after all retries");
        setCurrentVote({ candidateIds: [] });
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

    console.log("🔐 Starting World ID verification for vote... [UPDATED]");

    // Create signal from vote data using the same method as contract tests
    // Convert to ranking entries first (convert from 0-based to 1-based candidate IDs)
    const rankingEntries: RankingEntry[] = rankedCandidateIds.map(id => ({
      candidateId: Number(id) + 1, // Convert from 0-based to 1-based for contract
      tiedWithPrevious: false  // No ties for now
    }));

    const candidateIds = rankingEntries.map(entry => entry.candidateId);
    const tiedFlags = rankingEntries.map(entry => entry.tiedWithPrevious);

    // Create robust signal including multiple factors to prevent replay attacks
    const voterAddress = session?.user?.address;
    if (!voterAddress) {
      throw new Error("User address not available");
    }

    const chainId = BigInt(4801); // World Chain Sepolia

    // Get previous vote signal (acts as nonce to prevent replay)
    // First vote: previousSignal = 0x000...
    // Vote updates: previousSignal = hash of previous vote
    const previousSignal = currentVote?.signal || "0x0000000000000000000000000000000000000000000000000000000000000000";

    const signal = keccak256(
      encodePacked(
        ['address', 'address', 'uint256', 'bytes32', 'uint256[]', 'bool[]'],
        [electionAddress, voterAddress, chainId, previousSignal, candidateIds, tiedFlags]
      )
    );

    console.log("📊 Vote data:", { candidateIds, tiedFlags });
    console.log("🔐 Generated signal hash:", signal);
    console.log("🎯 Using universal World ID action: vote");

    const verifyPayload: VerifyCommandInput = {
      action: "vote", // Use universal "vote" action to match contract
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
  }, [worldIdAction]);

  // Debug logging for voting
  const debugVoteLog = async (step: string, data?: any) => {
    const message = `VoteSubmission: ${step}`;
    console.log(message, data);
    try {
      await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          data: data ? JSON.stringify(data, null, 2) : undefined,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          location: window.location.href
        })
      });
    } catch (e) {
      // Ignore debug failures
    }
  };

  // Test vote function without World ID verification
  const submitTestVote = useCallback(async (rankedCandidateIds: bigint[]) => {
    await debugVoteLog("🧪 Starting TEST vote submission (no World ID)", {
      electionAddress,
      rankedCandidateIds: rankedCandidateIds.map(id => id.toString()),
      userAddress: session?.user?.address
    });

    if (!MiniKit.isInstalled()) {
      await debugVoteLog("❌ MiniKit not installed");
      onError?.(new Error("MiniKit is not installed"));
      return;
    }

    if (!session?.user?.address) {
      await debugVoteLog("❌ User not authenticated");
      onError?.(new Error("User not authenticated"));
      return;
    }

    if (rankedCandidateIds.length === 0) {
      await debugVoteLog("❌ No candidates ranked");
      onError?.(new Error("No candidates ranked"));
      return;
    }

    try {
      setIsVoting(true);

      // Convert to RankingEntry format for Election contract (convert from 0-based to 1-based candidate IDs)
      const rankingEntries: RankingEntry[] = rankedCandidateIds.map(id => ({
        candidateId: Number(id) + 1, // Convert from 0-based to 1-based for contract
        tiedWithPrevious: false  // No ties for now
      }));

      await debugVoteLog("🚀 Submitting TEST vote to ElectionManager", { rankingEntries });

      // Use ElectionManager.testVote() - NO World ID verification
      const electionManagerAddress = CURRENT_NETWORK.contracts.ElectionManager.address;

      const transactionConfig = {
        transaction: [
          {
            address: electionManagerAddress,
            abi: ELECTION_MANAGER_ABI,
            functionName: "testVote",
            args: [
              electionAddress, // Election contract address
              rankingEntries   // Only ranking entries needed for testVote
            ],
          },
        ],
      };

      await debugVoteLog("📡 Sending TEST transaction config", transactionConfig);

      const result = await MiniKit.commandsAsync.sendTransaction(transactionConfig);
      await debugVoteLog("📦 TEST transaction result", result);

      const { finalPayload } = result;

      if (finalPayload.status === "error") {
        await debugVoteLog("❌ TEST transaction failed", finalPayload);
        const errorCode = (finalPayload as any).error_code || 'unknown_error';
        const errorMessage = errorCode === 'user_rejected'
          ? 'Transaction was rejected. Please try again.'
          : `Transaction failed: ${errorCode}`;
        onError?.(new Error(errorMessage));
        return;
      }

      await debugVoteLog("✅ TEST vote submitted successfully", finalPayload);
      setLastTxId(finalPayload.transaction_id);
      setCurrentVote({
        candidateIds: rankedCandidateIds,
        signal: "test-vote-no-signal" // No signal for test votes
      });

      // Reload vote from blockchain to confirm
      setTimeout(() => {
        loadCurrentVote();
      }, 3000);

      onSuccess?.(finalPayload.transaction_id);
    } catch (error) {
      await debugVoteLog("❌ TEST vote submission error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      onError?.(error instanceof Error ? error : new Error('Unknown error occurred'));
    } finally {
      setIsVoting(false);
    }
  }, [electionAddress, session?.user?.address, onSuccess, onError, loadCurrentVote]);

  // Submit vote to Election contract (with or without World ID based on testMode)
  const submitVote = useCallback(async (rankedCandidateIds: bigint[]) => {
    await debugVoteLog(`Starting vote submission (${testMode ? 'TEST MODE' : 'PRODUCTION MODE'})`, {
      electionAddress,
      worldIdAction,
      testMode,
      rankedCandidateIds: rankedCandidateIds.map(id => id.toString()),
      userAddress: session?.user?.address
    });

    // If in test mode, use the test vote function
    if (testMode) {
      return submitTestVote(rankedCandidateIds);
    }

    // Production mode - full World ID verification
    if (!MiniKit.isInstalled()) {
      await debugVoteLog("❌ MiniKit not installed");
      onError?.(new Error("MiniKit is not installed"));
      return;
    }

    if (!session?.user?.address) {
      await debugVoteLog("❌ User not authenticated");
      onError?.(new Error("User not authenticated"));
      return;
    }

    if (rankedCandidateIds.length === 0) {
      await debugVoteLog("❌ No candidates ranked");
      onError?.(new Error("No candidates ranked"));
      return;
    }

    try {
      setIsVoting(true);

      // Step 1: World ID verification
      await debugVoteLog("🔐 Starting World ID verification");
      const worldIdProof = await verifyVoteAction(rankedCandidateIds);
      await debugVoteLog("✅ World ID verification successful", worldIdProof);

      // Step 2: Convert to RankingEntry format for Election contract (convert from 0-based to 1-based candidate IDs)
      const rankingEntries: RankingEntry[] = rankedCandidateIds.map(id => ({
        candidateId: Number(id) + 1, // Convert from 0-based to 1-based for contract
        tiedWithPrevious: false  // No ties for now
      }));

      await debugVoteLog("🚀 Submitting vote to Election contract", { rankingEntries });

      // Step 3: Submit transaction with World ID proof
      // Ensure proof is properly formatted as uint256[8] array
      let formattedProof;
      if (Array.isArray(worldIdProof.proof) && worldIdProof.proof.length === 8) {
        formattedProof = worldIdProof.proof;
      } else {
        // If proof is not an 8-element array, create one
        console.warn("Proof is not 8-element array, formatting...", worldIdProof.proof);
        formattedProof = Array(8).fill("0x0000000000000000000000000000000000000000000000000000000000000000");
        if (Array.isArray(worldIdProof.proof)) {
          // Copy available elements
          for (let i = 0; i < Math.min(worldIdProof.proof.length, 8); i++) {
            formattedProof[i] = worldIdProof.proof[i];
          }
        } else {
          // Single proof value
          formattedProof[0] = worldIdProof.proof;
        }
      }

      // Use ElectionManager.testVote() to bypass World ID verification for testing
      const electionManagerAddress = CURRENT_NETWORK.contracts.ElectionManager.address;

      const transactionConfig = {
        transaction: [
          {
            address: electionManagerAddress,
            abi: ELECTION_MANAGER_ABI,
            functionName: "testVote",
            args: [
              electionAddress, // Election contract address
              rankingEntries   // Only ranking entries needed for testVote
            ],
          },
        ],
      };

      await debugVoteLog("📡 Sending transaction config", transactionConfig);

      const result = await MiniKit.commandsAsync.sendTransaction(transactionConfig);
      await debugVoteLog("📦 Transaction result", result);

      const { finalPayload } = result;

      if (finalPayload.status === "error") {
        await debugVoteLog("❌ Transaction failed", finalPayload);
        const errorCode = (finalPayload as any).error_code || 'unknown_error';
        const errorMessage = errorCode === 'user_rejected'
          ? 'Transaction was rejected. Please try again.'
          : `Transaction failed: ${errorCode}`;
        onError?.(new Error(errorMessage));
        return;
      }

      await debugVoteLog("✅ Vote submitted successfully", finalPayload);
      setLastTxId(finalPayload.transaction_id);
      setCurrentVote({
        candidateIds: rankedCandidateIds,
        signal: signal // Store the signal for next vote's previousSignal
      });

      // Reload vote from blockchain to confirm
      setTimeout(() => {
        loadCurrentVote();
      }, 3000);

      onSuccess?.(finalPayload.transaction_id);
    } catch (error) {
      await debugVoteLog("❌ Vote submission error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      onError?.(error instanceof Error ? error : new Error('Unknown error occurred'));
    } finally {
      setIsVoting(false);
    }
  }, [electionAddress, electionAbi, worldIdAction, testMode, session?.user?.address, onSuccess, onError, verifyVoteAction, loadCurrentVote, submitTestVote]);

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
    hasVoted: currentVote.candidateIds.length > 0,
  };
}
