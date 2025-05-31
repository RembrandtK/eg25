"use client";

import { useState, useEffect } from "react";
import { useElectionManager } from "@/hooks/useElectionManager";
import { useElectionVoting } from "@/hooks/useElectionVoting";
import { ElectionSelector } from "./ElectionSelector";
import { InteractiveRanking } from "./InteractiveRanking";
import { WalletAuthButton } from "./wallet-auth-button";
import { ELECTION_ABI } from "@/election-abi";
import { Candidate } from "@/election-abi";
import { useSession } from "next-auth/react";

// Mock candidates for now - in real implementation, these would come from the Election contract
const MOCK_CANDIDATES: Candidate[] = [
  { id: 1n, name: "Alice Johnson" },
  { id: 2n, name: "Bob Smith" },
  { id: 3n, name: "Carol Davis" },
  { id: 4n, name: "David Wilson" },
];

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

export function ElectionDashboard() {
  const { data: session } = useSession();
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [rankedCandidateIds, setRankedCandidateIds] = useState<bigint[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = !!session?.user?.address;

  // Debug: Log component state
  console.log("ElectionDashboard render:", {
    isAuthenticated,
    sessionExists: !!session,
    electionsCount: elections.length,
    electionsLoading
  });

  // Load elections from ElectionManager (always initialize, but only load when authenticated)
  const {
    elections,
    isLoading: electionsLoading,
    error: electionsError,
    loadElections,
    getActiveElections
  } = useElectionManager({ enabled: isAuthenticated });

  // Voting hook for selected election
  const {
    submitVote,
    loadCurrentVote,
    isVoting,
    isLoading: voteLoading,
    lastTxId,
    currentVote,
    hasVoted
  } = useElectionVoting({
    electionAddress: selectedElection?.address || "",
    electionAbi: ELECTION_ABI,
    onSuccess: (txId) => {
      console.log("Vote submitted successfully:", txId);
      setErrorMessage(null);
    },
    onError: (error) => {
      console.error("Error submitting vote:", error);
      setErrorMessage(error.message || "Failed to submit vote");
      setTimeout(() => setErrorMessage(null), 5000);
    }
  });

  // Auto-select first active election if none selected
  useEffect(() => {
    if (!selectedElection && elections.length > 0) {
      const activeElections = elections.filter(election => election.isActive);
      if (activeElections.length > 0) {
        setSelectedElection(activeElections[0]);
      }
    }
  }, [elections, selectedElection]);

  // Initialize ranking from current vote
  useEffect(() => {
    if (currentVote.length > 0 && rankedCandidateIds.length === 0) {
      setRankedCandidateIds(currentVote);
    }
  }, [currentVote, rankedCandidateIds.length]);

  const handleElectionSelect = (election: Election) => {
    setSelectedElection(election);
    setRankedCandidateIds([]); // Reset ranking when switching elections
    setErrorMessage(null);
  };

  const handleRankingChange = (newRankedIds: bigint[]) => {
    setRankedCandidateIds(newRankedIds);
  };

  const handleSubmitVote = () => {
    if (rankedCandidateIds.length > 0) {
      submitVote(rankedCandidateIds);
    }
  };

  // Show wallet connection if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Election Voting System</h1>
          <p className="text-gray-600 mb-6">
            Connect your World ID wallet to participate in elections.
          </p>
          <WalletAuthButton onSuccess={() => {
            console.log("Wallet connected successfully!");
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Election Voting System</h1>
        <p className="text-gray-600">
          Select an election and rank candidates in order of preference.
        </p>
      </div>

      {/* Error Messages */}
      {(electionsError || errorMessage) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-500 mr-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-red-700">{electionsError || errorMessage}</p>
          </div>
        </div>
      )}

      {/* Election Selection */}
      <ElectionSelector
        elections={elections}
        selectedElectionId={selectedElection?.id || null}
        onElectionSelect={handleElectionSelect}
        isLoading={electionsLoading}
      />

      {/* Voting Interface */}
      {selectedElection && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedElection.name}</h2>
                {selectedElection.description && (
                  <p className="text-gray-600 text-sm mt-1">{selectedElection.description}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {voteLoading && (
                  <div className="flex items-center space-x-1 text-purple-500">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Loading...</span>
                  </div>
                )}
                
                {isVoting && (
                  <div className="flex items-center space-x-1 text-blue-500">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Voting...</span>
                  </div>
                )}
                
                {lastTxId && (
                  <div className="flex items-center space-x-1 text-green-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs">Voted</span>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Ranking */}
            <InteractiveRanking
              candidates={MOCK_CANDIDATES}
              onRankingChange={handleRankingChange}
              disabled={isVoting}
              isUpdating={isVoting}
              initialRanking={currentVote}
            />

            {/* Submit Button */}
            {rankedCandidateIds.length > 0 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleSubmitVote}
                  disabled={isVoting || rankedCandidateIds.length === 0}
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isVoting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting Vote...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Submit Vote</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Info */}
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Election Details</h3>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Contract:</span>
                  <span className="ml-1 font-mono">{selectedElection.address.slice(0, 10)}...</span>
                </div>
                <div>
                  <span className="font-medium">World ID Action:</span>
                  <span className="ml-1">{selectedElection.worldIdAction}</span>
                </div>
                <div>
                  <span className="font-medium">Candidates:</span>
                  <span className="ml-1">{selectedElection.candidateCount}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-1 ${selectedElection.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                    {selectedElection.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
