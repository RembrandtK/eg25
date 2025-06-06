"use client";

import { useState } from "react";

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

interface ElectionSelectorProps {
  elections: Election[];
  selectedElectionId: bigint | null;
  onElectionSelect: (election: Election) => void;
  isLoading?: boolean;
}

export function ElectionSelector({
  elections,
  selectedElectionId,
  onElectionSelect,
  isLoading = false
}: ElectionSelectorProps) {
  const [showInactive, setShowInactive] = useState(false);

  const activeElections = elections.filter(e => e.isActive);
  const inactiveElections = elections.filter(e => !e.isActive);
  const displayElections = showInactive ? elections : activeElections;

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span>Loading elections...</span>
        </div>
      </div>
    );
  }

  if (elections.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Elections Available</h3>
          <p className="text-gray-600 text-sm mb-4">
            There are currently no elections to participate in.
          </p>
          <button
            onClick={() => {
              // For now, show instructions for creating elections
              alert("To create elections, you need to:\n\n1. Deploy the ElectionManager contract\n2. Get ELECTION_CREATOR_ROLE\n3. Call createElection() function\n\nThis will be added to the UI soon!");
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            How to Create Elections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Select Election</h2>
        
        {inactiveElections.length > 0 && (
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>{showInactive ? 'Hide' : 'Show'} inactive elections</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showInactive ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayElections.map((election) => (
          <div
            key={election.id.toString()}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedElectionId === election.id
                ? 'border-blue-500 bg-blue-50'
                : election.isActive
                ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                : 'border-gray-100 bg-gray-50 opacity-75'
            }`}
            onClick={() => election.isActive && onElectionSelect(election)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-gray-900">{election.name}</h3>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    election.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {election.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                {election.description && (
                  <p className="text-sm text-gray-600 mb-2">{election.description}</p>
                )}
              </div>
              
              {selectedElectionId === election.id && (
                <div className="text-blue-500 ml-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {displayElections.length === 0 && showInactive && (
        <div className="text-center text-gray-500 py-4">
          <p className="text-sm">No inactive elections found.</p>
        </div>
      )}

      {activeElections.length === 0 && !showInactive && (
        <div className="text-center text-gray-500 py-4">
          <p className="text-sm">No active elections available.</p>
          {inactiveElections.length > 0 && (
            <button
              onClick={() => setShowInactive(true)}
              className="text-blue-600 hover:text-blue-700 text-sm mt-1"
            >
              Show inactive elections
            </button>
          )}
        </div>
      )}
    </div>
  );
}
