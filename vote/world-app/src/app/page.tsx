"use client";

import { useState } from "react";
import { ElectionDashboard } from "@/components/ElectionDashboard";
import { BottomNavigation, TabType } from "@/components/BottomNavigation";
import { CandidatesTab } from "@/components/CandidatesTab";
import { InteractiveRankingTab } from "@/components/InteractiveRankingTab";

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
              candidates={[]}
              loading={false}
              error="Please select an election from the Elections tab to view candidates."
            />
          )}

          {activeTab === 'vote' && (
            <InteractiveRankingTab
              candidates={[]}
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
        candidateCount={0}
        rankedCount={0}
      />
    </div>
  );
}
