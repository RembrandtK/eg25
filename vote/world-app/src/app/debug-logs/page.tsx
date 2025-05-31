"use client";

import { useState, useEffect } from 'react';

interface DebugLog {
  id: string;
  timestamp: string;
  sessionId: string;
  userAgent: string;
  ip: string;
  url: string;
  appState: {
    walletConnected: boolean;
    verified: boolean;
    hasVoted: boolean;
  };
  contract: {
    address: string;
    network: string;
  };
  candidates: {
    loading: boolean;
    count: number;
    error: string | null;
    list?: Array<{ name: string; id: string | number }>;
  };
  environment: {
    mode: string;
    origin: string;
  };
}

export default function DebugLogsPage() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/debug?limit=100');
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredLogs = logs.filter(log => 
    !filter || 
    log.sessionId.includes(filter) ||
    log.url.toLowerCase().includes(filter.toLowerCase()) ||
    (log.candidates.error && log.candidates.error.toLowerCase().includes(filter.toLowerCase()))
  );

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading debug logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">🐛 Election App Debug Logs</h1>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={fetchLogs}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              🔄 Refresh
            </button>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh (5s)
            </label>
            
            <input
              type="text"
              placeholder="Filter by session, URL, or error..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 flex-1"
            />
          </div>

          <div className="bg-gray-800 rounded p-4 mb-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-blue-400">Total Logs</div>
                <div className="text-2xl font-bold">{logs.length}</div>
              </div>
              <div>
                <div className="text-green-400">Active Sessions</div>
                <div className="text-2xl font-bold">
                  {new Set(logs.map(l => l.sessionId)).size}
                </div>
              </div>
              <div>
                <div className="text-red-400">Errors</div>
                <div className="text-2xl font-bold">
                  {logs.filter(l => l.candidates.error).length}
                </div>
              </div>
              <div>
                <div className="text-purple-400">Votes</div>
                <div className="text-2xl font-bold">
                  {logs.filter(l => l.appState.hasVoted).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded p-4 mb-4">
            <p className="text-red-200">Error: {error}</p>
          </div>
        )}

        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <div key={log.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-sm text-gray-400">
                    {formatTime(log.timestamp)} • Session: {log.sessionId.slice(-8)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {log.userAgent.slice(0, 60)}...
                  </div>
                </div>
                <div className="flex gap-2">
                  {log.appState.walletConnected && <span className="bg-green-700 text-green-200 px-2 py-1 rounded text-xs">💳 Wallet</span>}
                  {log.appState.verified && <span className="bg-blue-700 text-blue-200 px-2 py-1 rounded text-xs">✅ Verified</span>}
                  {log.appState.hasVoted && <span className="bg-purple-700 text-purple-200 px-2 py-1 rounded text-xs">🗳️ Voted</span>}
                  {log.candidates.error && <span className="bg-red-700 text-red-200 px-2 py-1 rounded text-xs">❌ Error</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-blue-400 mb-1">Candidates</div>
                  <div>Count: {log.candidates.count}</div>
                  <div>Loading: {log.candidates.loading ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="text-green-400 mb-1">Contract</div>
                  <div>Address: {log.contract.address.slice(0, 10)}...</div>
                  <div>Network: {log.contract.network}</div>
                </div>
                <div>
                  <div className="text-yellow-400 mb-1">Environment</div>
                  <div>Mode: {log.environment.mode}</div>
                  <div>Origin: {log.environment.origin}</div>
                </div>
              </div>

              {log.candidates.error && (
                <div className="mt-3 p-3 bg-red-900 border border-red-700 rounded">
                  <div className="text-red-200 text-sm">
                    <strong>Error:</strong> {log.candidates.error}
                  </div>
                </div>
              )}

              {log.candidates.list && log.candidates.list.length > 0 && (
                <div className="mt-3 p-3 bg-gray-700 rounded">
                  <div className="text-gray-300 text-sm">
                    <strong>Candidates:</strong> {log.candidates.list.map(c => c.name).join(', ')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && !loading && (
          <div className="text-center text-gray-400 py-8">
            No debug logs found. {filter && 'Try adjusting your filter.'}
          </div>
        )}
      </div>
    </div>
  );
}
