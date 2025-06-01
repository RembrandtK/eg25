"use client";

import { useState, useEffect } from "react";
import { ElectionDashboard } from "@/components/ElectionDashboard";
import { BottomNavigation, TabType } from "@/components/BottomNavigation";
import { CandidatesTab } from "@/components/CandidatesTab";
import { InteractiveRankingTab } from "@/components/InteractiveRankingTab";
import { useElectionManager } from "@/hooks/useElectionManager";
import type { Election, Candidate } from "@/types/election";

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabType>('elections');

  // Shared state across all tabs
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [rankedCandidateIds, setRankedCandidateIds] = useState<bigint[]>([]);

  // Load elections at the parent level
  const { elections, electionsLoading, electionsError } = useElectionManager(true);

  // Auto-select first election when elections load
  useEffect(() => {
    if (elections.length > 0 && !selectedElection) {
      setSelectedElection(elections[0]);
    }
  }, [elections, selectedElection]);



  return (
    <div className="flex flex-col h-[100dvh] bg-white safe-area-inset">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-purple-600 text-center">Election Voting System</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-16">
        <div className="px-6 py-4">
          {/* Tab Content */}
          {activeTab === 'elections' && (
            <ElectionDashboard
              elections={elections}
              electionsLoading={electionsLoading}
              electionsError={electionsError}
              selectedElection={selectedElection}
              setSelectedElection={setSelectedElection}
              candidates={candidates}
              setCandidates={setCandidates}
              rankedCandidateIds={rankedCandidateIds}
              setRankedCandidateIds={setRankedCandidateIds}
            />
          )}

          {activeTab === 'candidates' && (
            <CandidatesTab
              candidates={candidates}
              loading={false}
              error={!selectedElection ? "Please select an election from the Elections tab to view candidates." : undefined}
            />
          )}

          {activeTab === 'vote' && (
            <InteractiveRankingTab
              candidates={candidates}
              selectedElection={selectedElection}
              verified={true}
              hasVoted={false}
              onRankingChange={setRankedCandidateIds}
            />
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        candidateCount={candidates.length}
        rankedCount={rankedCandidateIds.length}
      />
    </div>
  );
}
