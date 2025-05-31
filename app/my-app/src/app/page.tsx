"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { WalletConnectButton } from "@/components/VerifyButton";

import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import { createPublicClient, http } from "viem";
import { worldchain } from "@/lib/chains";
import { TransactionStatus } from "@/components/TransactionStatus";

import { BottomNavigation, TabType } from "@/components/BottomNavigation";
import { CandidatesTab } from "@/components/CandidatesTab";
import { InteractiveRankingTab } from "@/components/InteractiveRankingTab";
import { ELECTION_ABI, Candidate } from "@/election-abi";
import { ELECTION_MANAGER_ADDRESS } from "@/config/contract-addresses";

export default function Page() {
  const { data: session } = useSession();
  const [verified, setVerified] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [rankedCandidateIds, setRankedCandidateIds] = useState<bigint[]>([]);
  const [transactionId, setTransactionId] = useState<string>("");
  const [isVoting, setIsVoting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('elections');
  const [candidatesLoading, setCandidatesLoading] = useState(true);

  // Memoize the ABI to prevent infinite loops in child components
  const memoizedElectionAbi = useMemo(() => ELECTION_ABI, []);

  // Initialize Viem client - memoized to prevent infinite loops
  const client = useMemo(() => createPublicClient({
    chain: worldchain,
    transport: http("https://worldchain-sepolia.g.alchemy.com/public"),
  }), []);

  // Track transaction status
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      client,
      appConfig: {
        app_id: process.env.NEXT_PUBLIC_WLD_APP_ID || "",
      },
      transactionId,
    });

  // Update UI when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && !hasVoted) {
      setHasVoted(true);
      setIsVoting(false);
    }
  }, [isConfirmed, hasVoted]);

  // Handle verification success
  const handleVerificationSuccess = () => {
    console.log("Verification success callback triggered in Election App");
    setVerified(true);
  };

  // Auto-trigger verification when app loads
  useEffect(() => {
    if (!verified) {
      // Automatically trigger verification process
      const timer = setTimeout(() => {
        // This will be handled by the VerifyButton component automatically
        console.log("Auto-triggering World ID verification...");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [verified]);

  // Handle vote success
  const handleVoteSuccess = (txId: string) => {
    console.log("Vote initiated with transaction ID:", txId);
    setTransactionId(txId);
    setIsVoting(true);
  };

  // Load candidates from contract
  useEffect(() => {
    const loadCandidates = async () => {
      if (!verified) return; // Only load after verification

      try {
        console.log("🔍 Loading candidates from contract...");
        setCandidatesLoading(true);

        const result = await client.readContract({
          address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
          abi: memoizedElectionAbi,
          functionName: "getCandidates",
          args: [],
        });

        const candidateList = result as Candidate[];
        console.log(`✅ Successfully loaded ${candidateList.length} candidates:`, candidateList.map(c => c.name));
        setCandidates(candidateList);
        setCandidatesLoading(false);
      } catch (error) {
        console.error("❌ Error loading candidates:", error);
        setCandidatesLoading(false);
      }
    };

    loadCandidates();
  }, [verified, client, memoizedElectionAbi]);

  // Handle ranking change - memoized to prevent infinite loops
  const handleRankingChange = useCallback((rankedIds: bigint[]) => {
    setRankedCandidateIds(rankedIds);
  }, []);

  // Check if user has already voted when session is available
  useEffect(() => {
    const checkVotingStatus = async () => {
      if (session?.user?.address) {
        try {
          const hasUserVoted = await client.readContract({
            address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
            abi: memoizedElectionAbi,
            functionName: "checkHasVoted",
            args: [session.user.address as `0x${string}`],
          });
          setHasVoted(hasUserVoted as boolean);
        } catch (error) {
          console.error("Error checking voting status:", error);
        }
      }
    };

    checkVotingStatus();
  }, [session?.user?.address, client, memoizedElectionAbi]);

  return (
    <div className="flex flex-col h-[100dvh] bg-white safe-area-inset">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-purple-600 text-center">Election Voting</h1>

        {/* Only show transaction status when actively voting */}
        {(isConfirming || isVoting) && (
          <TransactionStatus
            isConfirming={isConfirming}
            isConfirmed={isConfirmed}
            isMinting={isVoting}
          />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-16">
        <div className="px-6 py-4">
          {!verified ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              {/* Auto-verification in progress */}
              <WalletConnectButton onConnectionSuccess={handleVerificationSuccess} />
            </div>
          ) : (
            <>
              {/* Tab Content */}
              {activeTab === 'elections' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Elections</h2>
                    <p className="text-gray-600 text-sm">
                      Available elections and voting systems
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">🚧 Coming Soon: Multiple Elections</h3>
                    <p className="text-sm text-blue-700 mb-2">
                      Future versions will support multiple elections, each with their own smart contract instance.
                    </p>
                    <p className="text-sm text-blue-600">
                      Currently showing: <strong>Demo Election</strong> with interactive peer ranking system.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'candidates' && (
                <CandidatesTab
                  candidates={candidates}
                  loading={candidatesLoading}
                  error={null}
                />
              )}

              {activeTab === 'vote' && (
                <InteractiveRankingTab
                  candidates={candidates}
                  verified={verified}
                  hasVoted={hasVoted}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation - only show when verified */}
      {verified && (
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          candidateCount={candidates.length}
          rankedCount={rankedCandidateIds.length}
        />
      )}


    </div>
  );
}
