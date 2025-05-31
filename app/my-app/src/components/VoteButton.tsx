"use client";

import { useState } from "react";
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";

interface VoteButtonProps {
  contractAddress: string;
  contractAbi: readonly any[];
  rankedCandidateIds: bigint[];
  onSuccess: (txId: string) => void;
  disabled?: boolean;
}

interface RankingEntry {
  candidateId: number;
  tiedWithPrevious: boolean;
}

export function VoteButton({
  contractAddress,
  contractAbi,
  rankedCandidateIds,
  onSuccess,
  disabled = false
}: VoteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  async function handleVote() {
    if (!MiniKit.isInstalled()) {
      console.error("MiniKit is not installed");
      return;
    }

    if (!session?.user?.address) {
      console.error("User not authenticated");
      return;
    }

    if (rankedCandidateIds.length === 0) {
      console.error("No candidates ranked");
      return;
    }

    try {
      setIsLoading(true);

      // Step 1: World ID verification
      console.log("🔐 Starting World ID verification for vote...");

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

      // Step 2: Convert to RankingEntry format for Election contract
      const rankingEntries: RankingEntry[] = rankedCandidateIds.map(id => ({
        candidateId: Number(id),
        tiedWithPrevious: false  // No ties for now
      }));

      console.log("🚀 Submitting vote to Election contract...");
      console.log("📋 Vote data:", rankingEntries);

      // Step 3: Submit transaction with World ID proof
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: contractAddress,
            abi: contractAbi,
            functionName: "vote",
            args: [
              signal,
              merkle_root,
              nullifier_hash,
              proof,
              rankingEntries
            ],
          },
        ],
      });

      if (finalPayload.status === "error") {
        console.error("Error casting vote:", finalPayload);
        const errorCode = (finalPayload as any).error_code || 'unknown_error';
        const errorMessage = errorCode === 'user_rejected'
          ? 'Transaction was rejected. Please try again.'
          : `Transaction failed: ${errorCode}`;
        throw new Error(errorMessage);
      }

      console.log("Vote cast successfully:", finalPayload);
      onSuccess(finalPayload.transaction_id);
    } catch (error) {
      console.error("Error casting vote:", error);
      // Re-throw to let parent handle the error display
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  const isDisabled = disabled || isLoading || rankedCandidateIds.length === 0;

  return (
    <div className="w-full max-w-xs mx-auto">
      <button
        onClick={handleVote}
        disabled={isDisabled}
        className={`w-full px-8 py-4 font-medium text-lg rounded-xl shadow-sm transition-colors touch-manipulation ${
          isDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-purple-500 text-white hover:bg-purple-600 active:bg-purple-700'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Casting Vote...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="mr-2">🗳️</span>
            <span>Cast Your Vote</span>
          </div>
        )}
      </button>

      {rankedCandidateIds.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Please rank at least one candidate to vote
        </p>
      )}

      {rankedCandidateIds.length > 0 && !isLoading && (
        <p className="text-xs text-green-600 text-center mt-2">
          Ready to vote with {rankedCandidateIds.length} candidate{rankedCandidateIds.length !== 1 ? 's' : ''} ranked
        </p>
      )}
    </div>
  );
}
