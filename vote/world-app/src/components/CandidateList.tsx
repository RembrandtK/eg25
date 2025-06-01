"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPublicClient, http } from "viem";
import { worldchainSepolia } from "viem/chains";
import { CURRENT_NETWORK } from "@/config/contracts";
import { Candidate } from "@/lib/candidateLoader";

const MAX_RETRIES = 3;

interface CandidateListProps {
  contractAddress: string;
  contractAbi: readonly any[];
  onCandidatesLoaded?: (candidates: Candidate[]) => void;
}

export function CandidateList({
  contractAddress,
  contractAbi,
  onCandidatesLoaded
}: CandidateListProps) {
  // Debug: Track renders and what's causing them
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log(`🔄 CandidateList render #${renderCount.current}`, {
    contractAddress,
    contractAbiLength: contractAbi?.length,
    onCandidatesLoadedType: typeof onCandidatesLoaded,
    timestamp: new Date().toISOString()
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Use refs to track if we've already fetched to prevent infinite loops
  const hasFetchedRef = useRef(false);
  const contractAddressRef = useRef<string | null>(null);

  // Memoize Viem client to prevent recreation on every render
  const client = useMemo(() => createPublicClient({
    chain: worldchainSepolia,
    transport: http(CURRENT_NETWORK.rpcUrl),
  }), []);

  useEffect(() => {
    console.log("🎯 useEffect triggered", {
      contractAddress,
      contractAbiLength: contractAbi?.length,
      hasFetched: hasFetchedRef.current,
      previousContract: contractAddressRef.current,
      renderCount: renderCount.current
    });

    // Only fetch if we haven't fetched for this contract yet
    if (!contractAddress || !contractAbi ||
        (hasFetchedRef.current && contractAddressRef.current === contractAddress)) {
      console.log("⏭️ Skipping fetch - already done or missing data");
      return;
    }

    console.log("🚀 Starting fetch for contract:", contractAddress);
    hasFetchedRef.current = true;
    contractAddressRef.current = contractAddress;

    const fetchCandidates = async (attempt = 0) => {
      try {
        console.log(`🔍 Starting fetch attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
        setLoading(true);
        setError(null);
        setRetryCount(attempt);

        console.log(`📡 Calling getCandidates on contract ${contractAddress}`);

        const result = await client.readContract({
          address: contractAddress as `0x${string}`,
          abi: contractAbi,
          functionName: "getCandidates",
          args: [],
        });

        const candidateList = result as Candidate[];
        console.log(`✅ Successfully loaded ${candidateList.length} candidates:`, candidateList.map(c => c.name));
        setCandidates(candidateList);

        // Call callback without causing re-renders
        if (onCandidatesLoaded) {
          console.log("📞 Calling onCandidatesLoaded callback");
          onCandidatesLoaded(candidateList);
        }

        setRetryCount(0);
        setLoading(false);
        console.log("🎉 Candidate loading completed successfully");
      } catch (err) {
        console.error(`❌ Error fetching candidates (attempt ${attempt + 1}):`, err);
        console.error("Contract address:", contractAddress);
        console.error("Error details:", err instanceof Error ? err.message : String(err));

        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          console.log(`🔄 Retrying in ${delay/1000} seconds... (${attempt + 1}/${MAX_RETRIES})`);

          const isRateLimit = err instanceof Error &&
            (err.message.includes('429') || err.message.includes('rate limit'));

          if (isRateLimit) {
            console.log('⏰ Rate limiting detected - using longer delay');
          }

          setTimeout(() => fetchCandidates(attempt + 1), isRateLimit ? delay * 2 : delay);
          return;
        }

        setError(`Failed to load candidates after ${MAX_RETRIES + 1} attempts: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [contractAddress, contractAbi]); // Minimal dependencies

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <div className="ml-3">
              <span className="text-gray-600">Loading candidates...</span>
              {retryCount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Retry attempt {retryCount}/{MAX_RETRIES}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="ml-2 text-red-800 text-sm">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">No candidates available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Election Candidates</h3>
          <p className="text-sm text-gray-500 mt-1">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} available</p>
        </div>

        <div className="divide-y divide-gray-200">
          {candidates.map((candidate) => (
            <div key={candidate.id.toString()} className="px-6 py-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">
                      {candidate.id.toString()}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{candidate.name}</h4>
                  {candidate.description && (
                    <p className="text-sm text-gray-500 mt-1">{candidate.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
