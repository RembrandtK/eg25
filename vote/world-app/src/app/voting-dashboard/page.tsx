"use client";

import { useState, useEffect } from 'react';

interface VotingOverview {
  totalRankers: number;
  candidateCount: number;
  timestamp: string;
  userRanking?: {
    address: string;
    ranking: number[];
    hasRanking: boolean;
    error?: string;
  };
}

interface ComparisonMatrix {
  candidateCount: number;
  comparisonMatrix: { [key: string]: { [key: string]: number } };
  timestamp: string;
}

export default function VotingDashboard() {
  const [overview, setOverview] = useState<VotingOverview | null>(null);
  const [matrix, setMatrix] = useState<ComparisonMatrix | null>(null);
  const [userAddress, setUserAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (address?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = address 
        ? `/api/voting-status?action=overview&address=${address}`
        : '/api/voting-status?action=overview';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overview');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatrix = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/voting-status?action=comparison-matrix');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setMatrix(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comparison matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Voting Status Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Real-time view of the peer ranking election system. This dashboard reads directly from the blockchain contracts.
          </p>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => fetchOverview()}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Overview'}
            </button>
            
            <button
              onClick={fetchMatrix}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load Comparison Matrix'}
            </button>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="User address (0x...)"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => fetchOverview(userAddress)}
                disabled={loading || !userAddress}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Check User
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Overview */}
        {overview && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Voting Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{overview.totalRankers}</div>
                <div className="text-sm text-blue-700">Total Rankers</div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{overview.candidateCount}</div>
                <div className="text-sm text-green-700">Candidates</div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {new Date(overview.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-sm text-purple-700">Last Updated</div>
              </div>
            </div>

            {/* User Ranking */}
            {overview.userRanking && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">User Ranking</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">
                    Address: <code className="bg-gray-200 px-2 py-1 rounded">{overview.userRanking.address}</code>
                  </div>
                  
                  {overview.userRanking.hasRanking ? (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Ranking:</div>
                      <div className="flex flex-wrap gap-2">
                        {overview.userRanking.ranking.map((candidateId, index) => (
                          <div key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            #{index + 1}: Candidate {candidateId}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">
                      {overview.userRanking.error || 'No ranking submitted yet'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comparison Matrix */}
        {matrix && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pairwise Comparison Matrix</h2>
            <p className="text-gray-600 mb-4">
              Shows how many voters prefer each candidate over another. 
              Row candidate vs Column candidate.
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left">Candidate</th>
                    {Array.from({ length: matrix.candidateCount }, (_, i) => (
                      <th key={i + 1} className="border border-gray-300 px-3 py-2 text-center">
                        C{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: matrix.candidateCount }, (_, i) => (
                    <tr key={i + 1} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-3 py-2 font-medium">
                        Candidate {i + 1}
                      </td>
                      {Array.from({ length: matrix.candidateCount }, (_, j) => (
                        <td key={j + 1} className="border border-gray-300 px-3 py-2 text-center">
                          {i + 1 === j + 1 ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <span className={
                              matrix.comparisonMatrix[i + 1]?.[j + 1] > 0 
                                ? 'text-green-600 font-medium' 
                                : 'text-gray-400'
                            }>
                              {matrix.comparisonMatrix[i + 1]?.[j + 1] || 0}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <strong>How to read:</strong> The number in row A, column B shows how many voters prefer candidate A over candidate B.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
