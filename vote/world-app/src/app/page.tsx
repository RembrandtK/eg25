"use client";

import { useState, useEffect } from "react";
import { ElectionDashboard } from "@/components/ElectionDashboard";
import { BottomNavigation, TabType } from "@/components/BottomNavigation";
import { CandidatesTab } from "@/components/CandidatesTab";
import { InteractiveRankingTab } from "@/components/InteractiveRankingTab";
import { ELECTION_ABI, Candidate } from "@/election-abi";

// Mock candidates for legacy tabs
const MOCK_CANDIDATES: Candidate[] = [
  { id: 1n, name: "Alice Johnson" },
  { id: 2n, name: "Bob Smith" },
  { id: 3n, name: "Carol Davis" },
  { id: 4n, name: "David Wilson" },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabType>('elections');



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
            <ElectionDashboard />
          )}

          {activeTab === 'candidates' && (
            <CandidatesTab
              candidates={MOCK_CANDIDATES}
              loading={false}
              error={null}
            />
          )}

          {activeTab === 'vote' && (
            <InteractiveRankingTab
              candidates={MOCK_CANDIDATES}
              verified={true}
              hasVoted={false}
            />
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        candidateCount={MOCK_CANDIDATES.length}
        rankedCount={0}
      />
    </div>
  );
}
