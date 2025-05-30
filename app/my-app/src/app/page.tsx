"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { CandidateList } from "@/components/CandidateList";
import { CandidateRanking } from "@/components/CandidateRanking";
import { VoteButton } from "@/components/VoteButton";
import { VerifyButton } from "@/components/VerifyButton";
import { WalletAuthButton } from "@/components/wallet-auth-button";
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
  const [walletConnected, setWalletConnected] = useState(false);
  const [verified, setVerified] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [rankedCandidateIds, setRankedCandidateIds] = useState<bigint[]>([]);
  const [transactionId, setTransactionId] = useState<string>("");
  const [isVoting, setIsVoting] = useState(false);

  // Memoize the ABI to prevent infinite loops in child components
  const memoizedElectionAbi = useMemo(() => ELECTION_ABI, []);

  // Initialize Viem client
  const client = createPublicClient({
    chain: worldchain,
    transport: http("https://worldchain-mainnet.g.alchemy.com/public"),
  });

  // Track transaction status
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      client,
      appConfig: {
        app_id: process.env.NEXT_PUBLIC_WLD_APP_ID || "",
      },
      transactionId,
    });

  // Check if user is authenticated when session changes
  useEffect(() => {
    if (status === "authenticated" && session?.user?.address) {
      setWalletConnected(true);
      console.log("User authenticated:", session.user);
    }
  }, [session, status]);

  // Update UI when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && !hasVoted) {
      setHasVoted(true);
      setIsVoting(false);
    }
  }, [isConfirmed, hasVoted]);

  // Handle wallet connection success
  const handleWalletConnected = () => {
    setWalletConnected(true);
    console.log("Wallet connected");
  };

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

  // Handle ranking change
  const handleRankingChange = (rankedIds: bigint[]) => {
    setRankedCandidateIds(rankedIds);
  };

  // Check if user has already voted when wallet connects
  useEffect(() => {
    const checkVotingStatus = async () => {
      if (walletConnected && session?.user?.address) {
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
  }, [walletConnected, session?.user?.address, client]);

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
                {!walletConnected
                  ? "Connect your wallet to continue"
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

            {!walletConnected ? (
              <WalletAuthButton onSuccess={handleWalletConnected} />
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
        walletConnected={walletConnected}
        verified={verified}
        hasVoted={hasVoted}
      />
    </div>
  );
}
