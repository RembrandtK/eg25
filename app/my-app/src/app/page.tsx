"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { CandidateList } from "@/components/CandidateList";
import { CandidateRanking } from "@/components/CandidateRanking";
import { VoteButton } from "@/components/VoteButton";
import { VerifyButton } from "@/components/VerifyButton";

import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import { createPublicClient, http } from "viem";
import { worldchain } from "@/lib/chains";
import { TransactionStatus } from "@/components/TransactionStatus";
import { DebugPanel } from "@/components/DebugPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BottomNavigation, TabType } from "@/components/BottomNavigation";
import { CandidatesTab } from "@/components/CandidatesTab";
import { RankingTab } from "@/components/RankingTab";
import { ELECTION_CONTRACT_ADDRESS, ELECTION_ABI } from "@/election-abi";

// // This would come from environment variables in a real app
// const APP_ID =
//   process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID ||
//   "app_9a73963d73efdf2e7d9472593dc9dffd";

interface Candidate {
  id: bigint;
  name: string;
  description: string;
  active: boolean;
}

export default function Page() {
  const { data: session, status } = useSession();
  const [verified, setVerified] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [rankedCandidateIds, setRankedCandidateIds] = useState<bigint[]>([]);
  const [transactionId, setTransactionId] = useState<string>("");
  const [isVoting, setIsVoting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('candidates');

  // Memoize the ABI to prevent infinite loops in child components
  const memoizedElectionAbi = useMemo(() => ELECTION_ABI, []);

  // Initialize Viem client - memoized to prevent infinite loops
  const client = useMemo(() => createPublicClient({
    chain: worldchain,
    transport: http("https://worldchain-mainnet.g.alchemy.com/public"),
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

  // Handle vote success
  const handleVoteSuccess = (txId: string) => {
    console.log("Vote initiated with transaction ID:", txId);
    setTransactionId(txId);
    setIsVoting(true);
  };

  // Handle candidates loaded - memoized to prevent infinite loops
  const handleCandidatesLoaded = useCallback((loadedCandidates: Candidate[]) => {
    setCandidates(loadedCandidates);
  }, []);

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
            address: ELECTION_CONTRACT_ADDRESS as `0x${string}`,
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

        {/* Status Info */}
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">
            {!verified
              ? "Verify with World ID to participate"
              : isConfirming || isVoting
              ? "Casting your vote..."
              : hasVoted
              ? "Vote submitted successfully!"
              : "Ready to vote"}
          </p>
          {session?.user?.address && (
            <p className="text-xs text-blue-500 mt-1">
              {`${session.user.address.substring(0, 6)}...${session.user.address.substring(38)}`}
            </p>
          )}
        </div>

        <TransactionStatus
          isConfirming={isConfirming}
          isConfirmed={isConfirmed}
          isMinting={isVoting}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-16">
        <div className="px-6 py-4">
          {!verified ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <VerifyButton onVerificationSuccess={handleVerificationSuccess} />
            </div>
          ) : (
            <>
              {/* Hidden CandidateList to load data */}
              <div className="hidden">
                <CandidateList
                  contractAddress={ELECTION_CONTRACT_ADDRESS}
                  contractAbi={memoizedElectionAbi}
                  onCandidatesLoaded={handleCandidatesLoaded}
                />
              </div>

              {/* Tab Content */}
              {activeTab === 'candidates' && (
                <CandidatesTab
                  candidates={candidates}
                  loading={false}
                  error={null}
                />
              )}

              {activeTab === 'ranking' && (
                <RankingTab
                  candidates={candidates}
                  rankedCandidateIds={rankedCandidateIds}
                  onRankingChange={handleRankingChange}
                  verified={verified}
                  hasVoted={hasVoted}
                  isVoting={isVoting || isConfirming}
                  onVoteSuccess={handleVoteSuccess}
                  contractAddress={ELECTION_CONTRACT_ADDRESS}
                  contractAbi={memoizedElectionAbi}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {verified && (
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          candidateCount={candidates.length}
          rankedCount={rankedCandidateIds.length}
        />
      )}

      {/* Debug Panel for development */}
      <DebugPanel
        candidates={candidates}
        loading={false}
        error={null}
        walletConnected={status === "authenticated" || !!(session as any)?.user?.address}
        verified={verified}
        hasVoted={hasVoted}
      />
    </div>
  );
}
