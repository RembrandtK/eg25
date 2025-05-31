"use client";

import { ReactNode, useEffect, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

// Simple global type declaration
declare global {
  interface Window {
    MiniKit: any;
  }
}

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple debug logging
  const debugLog = async (step: string, data?: any) => {
    const message = `MiniKit: ${step}`;
    console.log(message, data);
    try {
      await fetch("/api/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          data: data ? JSON.stringify(data, null, 2) : undefined,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          location: window.location.href
        }),
      });
    } catch (e) {
      // Ignore debug failures
    }
  };

  useEffect(() => {
    const initMiniKit = async () => {
      try {
        await debugLog("Starting initialization", {
          miniKitExists: typeof MiniKit !== 'undefined',
          windowMiniKit: typeof window.MiniKit,
          userAgent: navigator.userAgent
        });

        // Check if MiniKit is available
        if (!MiniKit) {
          throw new Error("MiniKit class not available");
        }

        await debugLog("✅ MiniKit class found");

        // Simple installation
        if (typeof MiniKit.install === "function") {
          await debugLog("Installing MiniKit");
          MiniKit.install({
            appId: "app_10719845a0977ef63ebe8eb9edb890ad",
          });
        }

        // Make globally available
        window.MiniKit = MiniKit;
        
        // Simple completion - don't wait for complex command checking
        setIsReady(true);
        await debugLog("🎉 MiniKit initialization complete!");

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        await debugLog("❌ Initialization failed", { error: errorMsg });
        setError(errorMsg);
      }
    };

    initMiniKit();
  }, []);

  // Loading state
  if (!isReady && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Initializing MiniKit...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">MiniKit Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Success - render children
  return <>{children}</>;
}
