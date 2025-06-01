"use client";

import { useState, useEffect } from "react";
import { ElectionSelector } from "./ElectionSelector";
import { Candidate } from "@/election-abi";
import { loadElectionCandidates } from "@/lib/candidateLoader";

// Candidates will be loaded from the selected Election contract

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

interface ElectionDashboardProps {
  elections: Election[];
  electionsLoading: boolean;
  electionsError: string | null;
  selectedElection: Election | null;
  setSelectedElection: (election: Election | null) => void;
  candidates: Candidate[];
  setCandidates: (candidates: Candidate[]) => void;
  rankedCandidateIds: bigint[];
  setRankedCandidateIds: (ids: bigint[]) => void;
}

export function ElectionDashboard({
  elections,
  electionsLoading,
  electionsError,
  selectedElection,
  setSelectedElection,
  candidates,
  setCandidates,
  rankedCandidateIds,
  setRankedCandidateIds
}: ElectionDashboardProps) {
  // Generate unique component ID to detect multiple instances
  const componentId = useState(() => Math.random().toString(36).substr(2, 9))[0];

  const handleElectionSelect = (election: Election) => {
    setSelectedElection(election);
    setRankedCandidateIds([]); // Reset ranking when switching elections
    // Don't reset candidates here - let the useEffect handle it to avoid race conditions
  };

  // Load candidates when election is selected
  useEffect(() => {
    // Debug: Log what selectedElection contains
    fetch('/api/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `🔍 CANDIDATE LOADING: useEffect triggered`,
        data: {
          selectedElection: selectedElection ? {
            id: selectedElection.id?.toString(),
            address: selectedElection.address,
            name: selectedElection.name,
            hasAddress: !!selectedElection.address
          } : null
        }
      })
    });

    if (!selectedElection?.address) {
      // Debug: Track when candidates are cleared due to no election
      fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🔧 ElectionDashboard: CLEARING candidates - no election selected`,
          data: {
            reason: 'no_election_address',
            selectedElection: selectedElection,
            timestamp: Date.now(),
            componentId: componentId,
            stackTrace: new Error().stack?.split('\n').slice(0, 5)
          }
        })
      }).catch(console.error);

      setCandidates([]);
      return;
    }

    const loadCandidates = async () => {
      try {
        console.log("Loading candidates for election:", selectedElection.address);

        // Debug API call to track candidate loading
        await fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🔍 CANDIDATE LOADING: Starting for election ${selectedElection.address}`,
            data: { electionAddress: selectedElection.address }
          })
        });

        // Use the tested candidate loading function
        const loadedCandidates = await loadElectionCandidates(selectedElection.address as `0x${string}`);

        console.log("Loaded candidates:", loadedCandidates);

        // Debug: Log final processed candidates
        await fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🔍 CANDIDATE LOADING: Final processed candidates`,
            data: {
              candidateCount: loadedCandidates.length,
              candidates: loadedCandidates.map(c => ({
                id: c.id.toString(),
                name: c.name,
                description: c.description
              }))
            }
          })
        });

        console.log("🔧 ElectionDashboard: Setting candidates state:", loadedCandidates.length, loadedCandidates.map(c => c.name));
        console.log("🔧 ElectionDashboard: Current candidates state before setCandidates:", candidates.length);
        console.log("🔧 ElectionDashboard: setCandidates function:", typeof setCandidates);

        // Debug API call to track setCandidates call (non-blocking)
        fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🔧 ElectionDashboard: About to call setCandidates`,
            data: {
              loadedCandidatesCount: loadedCandidates.length,
              currentCandidatesCount: candidates.length,
              setCandidatesType: typeof setCandidates
            }
          })
        }).catch(console.error);

        setCandidates(loadedCandidates);
        console.log("🔧 ElectionDashboard: setCandidates called, candidates should update");

        // Debug API call to track setCandidates completion (non-blocking)
        fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🔧 ElectionDashboard: setCandidates called`,
            data: { expectedCandidatesCount: loadedCandidates.length }
          })
        }).catch(console.error);
      } catch (error) {
        console.error("Error loading candidates:", error);

        // Debug: Track when candidates are cleared due to error
        fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🔧 ElectionDashboard: CLEARING candidates - error occurred`,
            data: {
              reason: 'error_loading_candidates',
              error: error instanceof Error ? error.message : String(error),
              electionAddress: selectedElection.address,
              timestamp: Date.now(),
              componentId: componentId,
              stackTrace: new Error().stack?.split('\n').slice(0, 5)
            }
          })
        }).catch(console.error);

        setCandidates([]);
      }
    };

    loadCandidates();
  }, [selectedElection?.address]); // Use stable address instead of entire object



  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Elections</h1>
        <p className="text-gray-600">
          Browse and select from available elections.
        </p>
      </div>

      {/* Error Messages */}
      {electionsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-500 mr-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-red-700">{electionsError}</p>
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


    </div>
  );
}
