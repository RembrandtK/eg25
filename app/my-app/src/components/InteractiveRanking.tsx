"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, GripVertical, ArrowUp, ArrowDown } from "lucide-react";

interface Candidate {
  id: bigint;
  name: string;
  description: string;
  active: boolean;
}

interface InteractiveRankingProps {
  candidates: Candidate[];
  onRankingChange: (rankedIds: bigint[]) => void;
  disabled?: boolean;
  isUpdating?: boolean;
  initialRanking?: bigint[]; // Add initial ranking support
}

export function InteractiveRanking({
  candidates,
  onRankingChange,
  disabled = false,
  isUpdating = false,
  initialRanking = []
}: InteractiveRankingProps) {
  const [rankedCandidates, setRankedCandidates] = useState<Candidate[]>([]);
  const [unrankedCandidates, setUnrankedCandidates] = useState<Candidate[]>([]);

  // Initialize ranking from contract data or start fresh
  useEffect(() => {
    if (candidates.length > 0) {
      console.log("🔄 Initializing InteractiveRanking with candidates:", candidates.length, "initialRanking:", initialRanking);

      if (initialRanking.length > 0) {
        // Initialize with existing ranking from contract
        const rankedCandidateObjects: Candidate[] = [];
        const unrankedCandidateObjects: Candidate[] = [];

        // First, add candidates in the order they appear in initialRanking
        initialRanking.forEach(candidateId => {
          const candidate = candidates.find(c => c.id === candidateId);
          if (candidate) {
            rankedCandidateObjects.push(candidate);
          }
        });

        // Then, add any candidates not in the ranking to unranked pool
        candidates.forEach(candidate => {
          if (!initialRanking.includes(candidate.id)) {
            unrankedCandidateObjects.push(candidate);
          }
        });

        console.log("📖 Restored ranking:", rankedCandidateObjects.map(c => c.name));
        setRankedCandidates(rankedCandidateObjects);
        setUnrankedCandidates(unrankedCandidateObjects);

        // Notify parent of the restored ranking
        const rankedIds = rankedCandidateObjects.map(candidate => candidate.id);
        onRankingChange(rankedIds);
      } else {
        // Start fresh with all candidates unranked
        console.log("🆕 Starting with fresh ranking");
        setUnrankedCandidates([...candidates]);
        setRankedCandidates([]);
        onRankingChange([]);
      }
    }
  }, [candidates, initialRanking, onRankingChange]);

  // Notify parent of ranking changes
  const notifyRankingChange = useCallback((newRankedCandidates: Candidate[]) => {
    const rankedIds = newRankedCandidates.map(candidate => candidate.id);
    onRankingChange(rankedIds);
  }, [onRankingChange]);

  // Add candidate to ranked list
  const addToRanking = (candidate: Candidate, position?: number) => {
    if (disabled || isUpdating) return;

    const newUnranked = unrankedCandidates.filter(c => c.id !== candidate.id);
    const newRanked = [...rankedCandidates];
    
    if (position !== undefined && position >= 0 && position <= newRanked.length) {
      newRanked.splice(position, 0, candidate);
    } else {
      newRanked.push(candidate);
    }

    setUnrankedCandidates(newUnranked);
    setRankedCandidates(newRanked);
    notifyRankingChange(newRanked);
  };

  // Remove candidate from ranked list
  const removeFromRanking = (candidate: Candidate) => {
    if (disabled || isUpdating) return;

    const newRanked = rankedCandidates.filter(c => c.id !== candidate.id);
    const newUnranked = [...unrankedCandidates, candidate];

    setRankedCandidates(newRanked);
    setUnrankedCandidates(newUnranked);
    notifyRankingChange(newRanked);
  };

  // Move candidate within ranked list
  const moveInRanking = (fromIndex: number, toIndex: number) => {
    if (disabled || isUpdating) return;

    const newRanked = [...rankedCandidates];
    const [movedCandidate] = newRanked.splice(fromIndex, 1);
    newRanked.splice(toIndex, 0, movedCandidate);
    
    setRankedCandidates(newRanked);
    notifyRankingChange(newRanked);
  };

  // Move up/down helpers
  const moveUp = (index: number) => {
    if (index > 0) {
      moveInRanking(index, index - 1);
    }
  };

  const moveDown = (index: number) => {
    if (index < rankedCandidates.length - 1) {
      moveInRanking(index, index + 1);
    }
  };

  // Generate rank display with tie support
  const getRankDisplay = (index: number) => {
    // For now, simple sequential ranking
    // TODO: Add tie support when frontend supports it
    return index + 1;
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 1: return 'bg-gray-100 text-gray-700 border-gray-200';
      case 2: return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  if (candidates.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-500 text-sm">No candidates available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Ranked Candidates Section (Top) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-green-50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Your Ranking
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {rankedCandidates.length > 0 
              ? `${rankedCandidates.length} candidate${rankedCandidates.length !== 1 ? 's' : ''} ranked`
              : 'Add candidates from the pool below'
            }
          </p>
        </div>

        {rankedCandidates.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <ArrowDown className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm">Start ranking by adding candidates from below</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rankedCandidates.map((candidate, index) => (
              <div
                key={candidate.id.toString()}
                className={`px-4 py-3 ${disabled || isUpdating ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  {/* Rank Number */}
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${getRankColor(index)}`}>
                    {getRankDisplay(index)}
                  </div>

                  {/* Drag Handle */}
                  <div className="flex-shrink-0">
                    <GripVertical className={`w-4 h-4 ${disabled || isUpdating ? 'text-gray-300' : 'text-gray-400 cursor-grab'}`} />
                  </div>

                  {/* Candidate Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{candidate.name}</h4>
                    {candidate.description && (
                      <p className="text-xs text-gray-500 truncate">{candidate.description}</p>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center space-x-1">
                    {/* Move Up */}
                    <button
                      onClick={() => moveUp(index)}
                      disabled={disabled || isUpdating || index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => moveDown(index)}
                      disabled={disabled || isUpdating || index === rankedCandidates.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromRanking(candidate)}
                      disabled={disabled || isUpdating}
                      className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Update Status */}
      {isUpdating && (
        <div className="flex items-center justify-center space-x-2 text-sm text-blue-600 bg-blue-50 rounded-lg p-3">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Updating blockchain...</span>
        </div>
      )}

      {/* Unranked Candidates Pool (Bottom) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Available Candidates
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {unrankedCandidates.length > 0 
              ? `${unrankedCandidates.length} candidate${unrankedCandidates.length !== 1 ? 's' : ''} available`
              : 'All candidates have been ranked'
            }
          </p>
        </div>

        {unrankedCandidates.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <p className="text-sm">All candidates have been ranked!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {unrankedCandidates.map((candidate) => (
              <div
                key={candidate.id.toString()}
                className={`px-4 py-3 ${disabled || isUpdating ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  {/* Candidate ID */}
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-sm">
                      {candidate.id.toString()}
                    </span>
                  </div>

                  {/* Candidate Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{candidate.name}</h4>
                    {candidate.description && (
                      <p className="text-xs text-gray-500 truncate">{candidate.description}</p>
                    )}
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => addToRanking(candidate)}
                    disabled={disabled || isUpdating}
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
