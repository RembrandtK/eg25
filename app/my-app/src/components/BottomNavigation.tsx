"use client";

import { useState } from 'react';

export type TabType = 'elections' | 'candidates' | 'vote';

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
        {/* Elections Tab */}
        <button
          onClick={() => onTabChange('elections')}
          className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-colors ${
            activeTab === 'elections'
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <span className="text-xs font-medium">Elections</span>
        </button>

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

        {/* Vote Tab */}
        <button
          onClick={() => onTabChange('vote')}
          className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-colors ${
            activeTab === 'vote'
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {rankedCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {rankedCount}
              </span>
            )}
            <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
              <span className="text-xs">⚡</span>
            </span>
          </div>
          <span className="text-xs font-medium">Vote</span>
        </button>


      </div>
    </div>
  );
}
