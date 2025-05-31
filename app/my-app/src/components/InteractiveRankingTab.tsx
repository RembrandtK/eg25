"use client";

import { useState, useCallback, useEffect } from "react";
import { InteractiveRanking } from "./InteractiveRanking";
import { WalletAuthButton } from "./wallet-auth-button";
import { usePeerRanking } from "@/hooks/usePeerRanking";
import { PEER_RANKING_ABI } from "@/peer-ranking-abi";
import { PEER_RANKING_ADDRESS } from "@/config/dynamic-contracts";
import { Candidate } from "@/election-abi";
import { useSession } from "next-auth/react";

interface InteractiveRankingTabProps {
  candidates: Candidate[];
  verified: boolean;
  hasVoted: boolean;
}

export function InteractiveRankingTab({
  candidates,
  verified,
  hasVoted
}: InteractiveRankingTabProps) {
  const { data: session } = useSession();
  const [rankedCandidateIds, setRankedCandidateIds] = useState<bigint[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    updateRanking,
    loadCurrentRanking,
    isUpdating,
    isLoading,
    lastTxId,
    currentRanking,
    isReady,
    hasUserAddress,
    miniKitInstalled
  } = usePeerRanking({
    contractAddress: PEER_RANKING_ADDRESS,
    contractAbi: PEER_RANKING_ABI,
    onSuccess: (txId) => {
      console.log("Ranking updated successfully:", txId);

      // Just clear any error messages, status icon will handle success feedback
      setErrorMessage(null);
      setSuccessMessage(null);
    },
    onError: (error) => {
      console.error("Error updating ranking:", error);
      setErrorMessage(error.message || "Failed to update ranking");
      setSuccessMessage(null);

      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    }
  });

  // Initialize ranking from contract when loaded
  useEffect(() => {
    if (currentRanking.length > 0) {
      console.log("📖 Initializing ranking from contract:", currentRanking);
      setRankedCandidateIds(currentRanking);
    }
  }, [currentRanking]);

  // Handle ranking changes from the interactive component
  const handleRankingChange = useCallback((newRankedIds: bigint[]) => {
    setRankedCandidateIds(newRankedIds);

    // Only update blockchain if user is ready and has made a ranking
    if (isReady && newRankedIds.length > 0) {
      updateRanking(newRankedIds);
    }
  }, [isReady, updateRanking]);

  // Clear messages when ranking changes
  useEffect(() => {
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [rankedCandidateIds]);

  if (!verified) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Required</h2>
        <p className="text-gray-600 text-center text-sm">
          Please verify your World ID to access the interactive ranking system.
        </p>
      </div>
    );
  }

  // Check if user needs to connect wallet after verification
  if (verified && !session?.user?.address) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-blue-500 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600 text-center text-sm mb-6">
          Connect your wallet to access the interactive ranking system and submit votes to the blockchain.
        </p>
        <WalletAuthButton onSuccess={() => {
          console.log("Wallet connected successfully!");
          // The session will update automatically
        }} />
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vote Already Submitted!</h2>
          <p className="text-gray-600 text-sm">
            You have already cast your vote in the traditional election system.
            The interactive ranking system is for new voting experiences.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">About Interactive Ranking</h3>
          <p className="text-sm text-blue-700">
            The interactive ranking system allows real-time preference updates and peer comparison tallying.
            Each ranking change is immediately recorded on the blockchain for transparent, live voting experiences.
          </p>
        </div>
      </div>
    );
  }

  // Status icon component
  const StatusIcon = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-1 text-purple-500" title="Loading ranking...">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs">Loading</span>
        </div>
      );
    }

    if (!isReady) {
      return (
        <div className="flex items-center space-x-1 text-orange-500" title="Connecting...">
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs">Connecting</span>
        </div>
      );
    }

    if (isUpdating) {
      return (
        <div className="flex items-center space-x-1 text-blue-500" title="Updating ranking...">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs">Updating</span>
        </div>
      );
    }

    if (lastTxId) {
      return (
        <div className="flex items-center space-x-1 text-green-500" title={`Last update: ${lastTxId}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs">Saved</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1 text-gray-400" title="Ready">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs">Ready</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Status Icon - Top Right */}
        <div className="absolute top-0 right-0">
          <StatusIcon />
        </div>

        <div className="text-center pr-20">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Interactive Ranking</h2>
          <p className="text-gray-600 text-sm">
            Build your ranking by adding candidates from the pool below.
            Changes are saved to the blockchain in real-time.
          </p>
        </div>
      </div>

      {/* Error Messages Only (success shown in status icon) */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <div className="text-red-500 mr-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Interactive Ranking Component */}
      <InteractiveRanking
        candidates={candidates}
        onRankingChange={handleRankingChange}
        disabled={!isReady}
        isUpdating={isUpdating}
      />

      {/* Info Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">How It Works</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Add candidates from the pool to your ranking</li>
          <li>• Reorder candidates by dragging or using arrow buttons</li>
          <li>• Remove candidates by clicking the X button</li>
          <li>• Changes are automatically saved to the blockchain</li>
          <li>• No submission button needed - updates are real-time!</li>
        </ul>
      </div>

      {/* Stats */}
      {rankedCandidateIds.length > 0 && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-4 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-4 py-2">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span>{rankedCandidateIds.length} ranked</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              <span>{candidates.length - rankedCandidateIds.length} available</span>
            </div>
            {lastTxId && (
              <div className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                <span>Last update: {lastTxId.slice(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
}
