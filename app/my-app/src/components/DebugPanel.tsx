"use client";

import { useState, useEffect, useRef } from "react";
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
  const [lastSent, setLastSent] = useState<string>('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const sessionId = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);

  // Generate debug data
  const generateDebugData = () => ({
    sessionId: sessionId.current,
    url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    appState: {
      walletConnected,
      verified,
      hasVoted,
    },
    contract: {
      address: ELECTION_CONTRACT_ADDRESS,
      network: 'worldchain-sepolia (4801)',
    },
    candidates: {
      loading,
      count: candidates.length,
      error,
      list: candidates.slice(0, 5).map((c, i) => ({
        id: typeof c.id === 'bigint' ? c.id.toString() : (c.id || i),
        name: c.name || 'Unknown'
      })),
    },
    environment: {
      mode: process.env.NODE_ENV || 'development',
      origin: typeof window !== 'undefined' ? window.location.origin : 'SSR',
    },
    performance: {
      loadTime: typeof window !== 'undefined' ? performance.now() : 0,
    },
  });

  // Send debug data to server
  const sendDebugData = async () => {
    if (sendStatus === 'sending') return;

    setSendStatus('sending');
    try {
      const debugData = generateDebugData();
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(debugData, (_key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Debug data sent successfully:', result);
        setSendStatus('success');
        setLastSent(new Date().toLocaleTimeString());
        setTimeout(() => setSendStatus('idle'), 2000);
      } else {
        const errorText = await response.text();
        console.error('❌ Debug data send failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        setSendStatus('error');
        setTimeout(() => setSendStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('❌ Failed to send debug data:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        debugData: generateDebugData(),
      });
      setSendStatus('error');
      setTimeout(() => setSendStatus('idle'), 3000);
    }
  };

  // Auto-send debug data when important state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      sendDebugData();
    }, 1000); // Debounce rapid changes

    return () => clearTimeout(timer);
  }, [walletConnected, verified, hasVoted, candidates.length, error]);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-lg text-xs font-mono hover:bg-gray-700 transition-colors ${
          sendStatus === 'success' ? 'bg-green-800 text-green-200' :
          sendStatus === 'error' ? 'bg-red-800 text-red-200' :
          sendStatus === 'sending' ? 'bg-yellow-800 text-yellow-200' :
          'bg-gray-800 text-white'
        }`}
      >
        🐛 Debug {isOpen ? '▼' : '▲'} {
          sendStatus === 'sending' ? '📡' :
          sendStatus === 'success' ? '✅' :
          sendStatus === 'error' ? '❌' : '📊'
        }
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-gray-900 text-green-400 p-4 rounded-lg shadow-lg max-w-sm w-80 font-mono text-xs">
          <div className="space-y-2">
            <div className="text-yellow-400 font-bold">🔍 Debug Panel (Server Monitoring)</div>

            <div className="border-t border-gray-700 pt-2">
              <div className="text-blue-400">📡 Server Monitoring:</div>
              <div>Status: {
                sendStatus === 'sending' ? '🔄 Sending...' :
                sendStatus === 'success' ? '✅ Connected' :
                sendStatus === 'error' ? '❌ Failed' :
                '⏳ Ready'
              }</div>
              <div>Session: {sessionId.current.slice(-8)}</div>
              {lastSent && <div>Last Sent: {lastSent}</div>}
              <button
                onClick={sendDebugData}
                disabled={sendStatus === 'sending'}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs mt-1"
              >
                📤 Send Now
              </button>
            </div>

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
