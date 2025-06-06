"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { MiniKit } from "@worldcoin/minikit-js";

interface WalletAuthButtonProps {
  onSuccess?: () => void;
}

export function WalletAuthButton({ onSuccess }: WalletAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to send debug logs to server
  const debugLog = async (step: string, data?: any) => {
    const message = `WalletAuth ${step}`;
    console.log(message, data);
    try {
      await fetch("/api/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          data: data ? JSON.stringify(data, null, 2) : undefined,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (e) {
      // Ignore debug logging errors
    }
  };



  const handleWalletAuth = async () => {
    // Check if MiniKit is available
    if (!MiniKit || !MiniKit.isInstalled()) {
      await debugLog("ERROR: MiniKit not installed or not available");

      // In development, show a more helpful message
      if (process.env.NODE_ENV === 'development') {
        const shouldContinue = confirm(
          "MiniKit is not available. This is expected in development mode outside the World App.\n\n" +
          "Click OK to simulate a successful wallet connection for testing, or Cancel to stop."
        );

        if (shouldContinue) {
          // This development mode simulation should be removed in production
          console.warn("Development mode: Mock wallet auth is enabled. This should be removed in production.");
        }
      } else {
        alert("MiniKit is not available. Please make sure you're running this in the World App or that MiniKit has been properly initialized.");
      }
      return;
    }

    setIsLoading(true);
    try {
      await debugLog("Step 1: Fetching nonce...");
      const res = await fetch("/api/nonce");
      if (!res.ok) {
        throw new Error(`Failed to fetch nonce: ${res.status}`);
      }
      const { nonce } = await res.json();
      await debugLog("Step 2: Got nonce", { nonce });

      await debugLog("Step 3: Calling MiniKit walletAuth...");
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        expirationTime: new Date(new Date().getTime() + 1 * 60 * 60 * 1000),
        statement: "Sign in with your World ID wallet",
      });

      await debugLog("Step 4: Got wallet auth response", { status: finalPayload.status });

      if (finalPayload.status === "error") {
        await debugLog("ERROR: Wallet auth failed", { error_code: finalPayload.error_code });
        throw new Error(`Wallet auth failed: ${finalPayload.error_code}`);
      }

      await debugLog("Step 5: Verifying SIWE message...");
      const verifyRes = await fetch("/api/complete-siwe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: finalPayload,
          nonce,
        }),
      });

      if (!verifyRes.ok) {
        await debugLog("ERROR: SIWE verification request failed", { status: verifyRes.status });
        throw new Error(`SIWE verification failed: ${verifyRes.status}`);
      }

      const verification = await verifyRes.json();
      await debugLog("Step 6: SIWE verification result", verification);

      if (verification.isValid) {
        await debugLog("Step 7: Signing in with NextAuth...");
        const signInResult = await signIn("worldcoin-wallet", {
          message: finalPayload.message,
          signature: finalPayload.signature,
          address: finalPayload.address,
          nonce,
          redirect: false,
        });

        await debugLog("Step 8: NextAuth sign in result", signInResult);

        // Call onSuccess if provided
        if (onSuccess) {
          await debugLog("Step 9: Calling onSuccess callback");
          onSuccess();
        }
      } else {
        await debugLog("ERROR: SIWE message verification failed", verification);
        throw new Error("SIWE message verification failed");
      }
    } catch (error) {
      await debugLog("ERROR: Wallet auth exception", {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleWalletAuth}
      disabled={isLoading}
      className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg border-2 border-yellow-900/50 font-bold shadow-md transition-colors disabled:opacity-50 tracking-wide"
    >
      {isLoading ? (
        <div className="flex items-center">
          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="font-serif">Connecting...</span>
        </div>
      ) : (
        <div className="flex items-center">
          <span className="mr-2">🎰</span>
          <span className="font-serif">Connect Wallet</span>
        </div>
      )}
    </button>
  );
}
