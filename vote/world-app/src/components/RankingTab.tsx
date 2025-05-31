"use client";

import { CandidateRanking } from "./CandidateRanking";
import { VoteButton } from "./VoteButton";
import { Candidate } from "@/election-abi";

interface RankingTabProps {
  candidates: Candidate[];
  rankedCandidateIds: bigint[];
  onRankingChange: (rankedIds: bigint[]) => void;
  verified: boolean;
  hasVoted: boolean;
  isVoting: boolean;
  onVoteSuccess: (txId: string) => void;
  contractAddress: string;
  contractAbi: any;
}

export function RankingTab({
  candidates,
  rankedCandidateIds,
  onRankingChange,
  verified,
  hasVoted,
  isVoting,
  onVoteSuccess,
  contractAddress,
  contractAbi
}: RankingTabProps) {

  if (!verified) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-purple-500 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <p className="text-gray-600 text-center mb-2">Verification Required</p>
        <p className="text-gray-500 text-sm text-center">Please verify with World ID to start ranking candidates.</p>
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vote Submitted!</h2>
          <p className="text-gray-600 text-sm">
            Your vote has been recorded on the blockchain. Thank you for participating in the election!
          </p>
        </div>

        {rankedCandidateIds.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">Your Final Ranking</h3>
            <div className="space-y-2">
              {rankedCandidateIds.map((candidateId, index) => {
                const candidate = candidates.find(c => c.id === candidateId);
                return (
                  <div key={candidateId.toString()} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{candidate?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{candidate?.description || ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-600 text-center mb-2">No candidates to rank</p>
        <p className="text-gray-500 text-sm text-center">Candidates must be loaded before you can create your ranking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Rank Your Candidates</h2>
        <p className="text-gray-600 text-sm">
          Drag and drop to arrange candidates in your preferred order
        </p>
      </div>

      <CandidateRanking
        candidates={candidates}
        onRankingChange={onRankingChange}
      />

      {rankedCandidateIds.length > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              You have ranked {rankedCandidateIds.length} of {candidates.length} candidates
            </p>
          </div>

          <VoteButton
            contractAddress={contractAddress}
            contractAbi={contractAbi}
            rankedCandidateIds={rankedCandidateIds}
            onSuccess={onVoteSuccess}
            disabled={isVoting || rankedCandidateIds.length === 0}
          />
        </div>
      )}

      {rankedCandidateIds.length === 0 && (
        <div className="text-center text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
          Start by dragging candidates from the list above to create your ranking
        </div>
      )}
    </div>
  );
}
