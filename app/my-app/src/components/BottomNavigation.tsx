"use client";

import { useState } from 'react';

export type TabType = 'candidates' | 'ranking';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  candidateCount?: number;
  rankedCount?: number;
}

export function BottomNavigation({ 
  activeTab, 
  onTabChange, 
  candidateCount = 0,
  rankedCount = 0 
}: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex h-16">
        {/* Candidates Tab */}
        <button
          onClick={() => onTabChange('candidates')}
          className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-colors ${
            activeTab === 'candidates'
              ? 'text-purple-600 bg-purple-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="relative">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {candidateCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {candidateCount}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Candidates</span>
        </button>

        {/* Ranking Tab */}
        <button
          onClick={() => onTabChange('ranking')}
          className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-colors ${
            activeTab === 'ranking'
              ? 'text-purple-600 bg-purple-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="relative">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            {rankedCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {rankedCount}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">My Ranking</span>
        </button>
      </div>
    </div>
  );
}
