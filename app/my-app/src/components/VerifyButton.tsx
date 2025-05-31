"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { MiniKit } from "@worldcoin/minikit-js";
import { signIn } from "next-auth/react";

interface WalletConnectButtonProps {
  onConnectionSuccess: () => void;
}

export function WalletConnectButton({ onConnectionSuccess }: WalletConnectButtonProps) {
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

  // Wallet connection function
  const handleWalletConnect = async () => {
    if (!MiniKit.isInstalled()) {
      setVerificationError("World App is not installed");
      return;
    }

    setIsConnectingWallet(true);
    try {
      console.log("Starting wallet connection...");

      // Get nonce for wallet auth
      const res = await fetch("/api/nonce");
      if (!res.ok) {
        throw new Error(`Failed to fetch nonce: ${res.status}`);
      }
      const { nonce } = await res.json();
      console.log("Got nonce for wallet auth:", nonce);

      // Perform wallet authentication
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        expirationTime: new Date(new Date().getTime() + 1 * 60 * 60 * 1000),
        statement: "Connect your wallet to participate in elections",
      });

      console.log("Wallet auth response:", finalPayload);

      if (finalPayload.status === "error") {
        throw new Error(`Wallet auth failed: ${finalPayload.error_code}`);
      }

      // Verify SIWE message
      const verifyRes = await fetch("/api/complete-siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: finalPayload,
          nonce,
        }),
      });

      if (!verifyRes.ok) {
        throw new Error(`SIWE verification failed: ${verifyRes.status}`);
      }

      const verification = await verifyRes.json();
      console.log("SIWE verification result:", verification);

      if (verification.isValid) {
        // Sign in with NextAuth
        const signInResult = await signIn("worldcoin-wallet", {
          message: finalPayload.message,
          signature: finalPayload.signature,
          address: finalPayload.address,
          nonce,
          redirect: false,
        });

        console.log("NextAuth sign in result:", signInResult);

        // Complete the connection process
        setIsConnectingWallet(false);
        onConnectionSuccess();
      } else {
        throw new Error("SIWE message verification failed");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      setVerificationError(
        error instanceof Error
          ? `Wallet connection failed: ${error.message}`
          : "Unknown wallet connection error"
      );
      setIsConnectingWallet(false);
    }
  };



  return (
    <div className="flex flex-col items-center space-y-4">
      {verificationError && (
        <div className="text-red-500 text-sm mb-2 text-center">{verificationError}</div>
      )}

      <div className="flex flex-col items-center space-y-2">
        <div className="text-sm text-gray-600 text-center">
          Connect your wallet to participate
        </div>
        <button
          onClick={handleWalletConnect}
          disabled={isConnectingWallet}
          className="w-full max-w-xs px-8 py-4 bg-purple-500 text-white font-medium text-lg rounded-xl shadow-sm hover:bg-purple-600 active:bg-purple-700 transition-colors touch-manipulation flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Wallet className="w-5 h-5" />
          {isConnectingWallet ? "Connecting..." : "Connect Wallet"}
        </button>
      </div>
    </div>
  );
}
