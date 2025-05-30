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
      if (status === "authenticated" && session?.user?.address) {
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
  }, [status, session?.user?.address, client, memoizedElectionAbi]);

  return (
    <div className="flex flex-col h-[100dvh] bg-white safe-area-inset">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-8">
        <h1 className="text-3xl font-bold text-purple-600">Election Voting</h1>

        {hasVoted ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h2 className="text-xl font-semibold text-green-800 mb-2">Vote Cast Successfully!</h2>
            <p className="text-gray-600">Thank you for participating in the election.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <p className="text-lg">
                {status !== "authenticated"
                  ? "Loading your wallet..."
                  : !verified
                  ? "Verify with World ID to participate in the election"
                  : isConfirming || isVoting
                  ? "Casting your vote..."
                  : "Rank the candidates and cast your vote"}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Wallet:{" "}
                {session?.user?.address
                  ? `${session.user.address.substring(
                      0,
                      6
                    )}...${session.user.address.substring(38)}`
                  : "..."}
              </p>

              <TransactionStatus
                isConfirming={isConfirming}
                isConfirmed={isConfirmed}
                isMinting={isVoting}
              />
            </div>

            {status !== "authenticated" ? (
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Connecting to your World App wallet...</p>
              </div>
            ) : !verified ? (
              <VerifyButton onVerificationSuccess={handleVerificationSuccess} />
            ) : (
              <div className="w-full max-w-md space-y-6">
                <CandidateList
                  contractAddress={ELECTION_CONTRACT_ADDRESS}
                  contractAbi={memoizedElectionAbi}
                  onCandidatesLoaded={handleCandidatesLoaded}
                />

                {candidates.length > 0 && (
                  <>
                    <CandidateRanking
                      candidates={candidates}
                      onRankingChange={handleRankingChange}
                      disabled={isVoting || isConfirming}
                    />

                    <VoteButton
                      contractAddress={ELECTION_CONTRACT_ADDRESS}
                      contractAbi={memoizedElectionAbi}
                      rankedCandidateIds={rankedCandidateIds}
                      onSuccess={handleVoteSuccess}
                      disabled={isVoting || isConfirming}
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Debug Panel for development */}
      <DebugPanel
        candidates={candidates}
        loading={false}
        error={null}
        walletConnected={status === "authenticated"}
        verified={verified}
        hasVoted={hasVoted}
      />
    </div>
  );
}
