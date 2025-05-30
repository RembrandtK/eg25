"use client";

import { useState } from "react";
import { ELECTION_CONTRACT_ADDRESS } from "@/election-abi";

interface DebugPanelProps {
  candidates?: any[];
  loading?: boolean;
  error?: string | null;
  walletConnected?: boolean;
  verified?: boolean;
  hasVoted?: boolean;
}

export function DebugPanel({ 
  candidates = [], 
  loading = false, 
  error = null,
  walletConnected = false,
  verified = false,
  hasVoted = false
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-mono hover:bg-gray-700 transition-colors"
      >
        🐛 Debug {isOpen ? '▼' : '▲'}
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-gray-900 text-green-400 p-4 rounded-lg shadow-lg max-w-sm w-80 font-mono text-xs">
          <div className="space-y-2">
            <div className="text-yellow-400 font-bold">🔍 Frontend Debug Panel</div>
            
            <div className="border-t border-gray-700 pt-2">
              <div className="text-blue-400">📊 App State:</div>
              <div>Wallet: {walletConnected ? '✅ Connected' : '❌ Disconnected'}</div>
              <div>Verified: {verified ? '✅ Yes' : '❌ No'}</div>
              <div>Has Voted: {hasVoted ? '✅ Yes' : '❌ No'}</div>
            </div>

            <div className="border-t border-gray-700 pt-2">
              <div className="text-blue-400">🏗️ Contract:</div>
              <div>Address: {ELECTION_CONTRACT_ADDRESS.slice(0, 10)}...</div>
              <div>Network: worldchain-sepolia (4801)</div>
            </div>

            <div className="border-t border-gray-700 pt-2">
              <div className="text-blue-400">👥 Candidates:</div>
              <div>Loading: {loading ? '🔄 Yes' : '✅ No'}</div>
              <div>Count: {candidates.length}</div>
              <div>Error: {error ? '❌ Yes' : '✅ No'}</div>
              {error && (
                <div className="text-red-400 text-xs mt-1 break-words">
                  {error.slice(0, 100)}...
                </div>
              )}
            </div>

            {candidates.length > 0 && (
              <div className="border-t border-gray-700 pt-2">
                <div className="text-blue-400">📋 Candidate List:</div>
                {candidates.slice(0, 3).map((candidate, index) => (
                  <div key={index} className="text-xs">
                    {index + 1}. {candidate.name || 'Unknown'}
                  </div>
                ))}
                {candidates.length > 3 && (
                  <div className="text-gray-500">...and {candidates.length - 3} more</div>
                )}
              </div>
            )}

            <div className="border-t border-gray-700 pt-2">
              <div className="text-blue-400">🕐 Timestamp:</div>
              <div>{new Date().toLocaleTimeString()}</div>
            </div>

            <div className="border-t border-gray-700 pt-2">
              <div className="text-blue-400">🌐 Environment:</div>
              <div>Mode: {process.env.NODE_ENV}</div>
              <div>URL: {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</div>
            </div>

            <div className="border-t border-gray-700 pt-2 text-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
              >
                🔄 Reload Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
