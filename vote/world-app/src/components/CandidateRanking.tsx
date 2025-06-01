"use client";

import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Candidate } from "@/lib/candidateLoader";

interface CandidateRankingProps {
  candidates: Candidate[];
  onRankingChange: (rankedIds: bigint[]) => void;
  disabled?: boolean;
}

export function CandidateRanking({
  candidates,
  onRankingChange,
  disabled = false
}: CandidateRankingProps) {
  const [rankedCandidates, setRankedCandidates] = useState<Candidate[]>([]);

  // Initialize ranking with all candidates
  useEffect(() => {
    if (candidates.length > 0 && rankedCandidates.length === 0) {
      setRankedCandidates([...candidates]);
    }
  }, [candidates, rankedCandidates.length]);

  // Notify parent of ranking changes
  useEffect(() => {
    if (rankedCandidates.length > 0) {
      const rankedIds = rankedCandidates.map(candidate => candidate.id);
      onRankingChange(rankedIds);
    }
  }, [rankedCandidates, onRankingChange]);

  const moveCandidate = (fromIndex: number, toIndex: number) => {
    if (disabled) return;

    const newRanking = [...rankedCandidates];
    const [movedCandidate] = newRanking.splice(fromIndex, 1);
    newRanking.splice(toIndex, 0, movedCandidate);
    setRankedCandidates(newRanking);
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      moveCandidate(index, index - 1);
    }
  };

  const moveDown = (index: number) => {
    if (index < rankedCandidates.length - 1) {
      moveCandidate(index, index + 1);
    }
  };

  if (candidates.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-500 text-sm">No candidates to rank</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Rank Your Preferences</h3>
          <p className="text-sm text-gray-500 mt-1">
            Drag to reorder or use the arrow buttons. #1 is your top choice.
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {rankedCandidates.map((candidate, index) => (
            <div
              key={candidate.id.toString()}
              className={`px-6 py-4 ${disabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center space-x-4">
                {/* Rank Number */}
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0
                      ? 'bg-yellow-100 text-yellow-800'
                      : index === 1
                      ? 'bg-gray-100 text-gray-700'
                      : index === 2
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                {/* Drag Handle */}
                <div className="flex-shrink-0">
                  <GripVertical className={`w-5 h-5 ${disabled ? 'text-gray-300' : 'text-gray-400 cursor-grab'}`} />
                </div>

                {/* Candidate Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {candidate.name}
                  </h4>
                  {candidate.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {candidate.description}
                    </p>
                  )}
                </div>

                {/* Move Buttons */}
                <div className="flex-shrink-0 flex flex-col space-y-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={disabled || index === 0}
                    className={`p-1 rounded ${
                      disabled || index === 0
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={disabled || index === rankedCandidates.length - 1}
                    className={`p-1 rounded ${
                      disabled || index === rankedCandidates.length - 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Your vote will be cast with this ranking order. You can change it before submitting.
          </p>
        </div>
      </div>
    </div>
  );
}
