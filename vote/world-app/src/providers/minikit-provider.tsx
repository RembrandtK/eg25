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
          await debugLog("❌ MiniKit class not available");
          if (initAttempts.current < maxAttempts) {
            await debugLog("⏳ Retrying in 1 second...");
            setTimeout(initializeMiniKit, 1000);
            return;
          } else {
            const errorMsg = "MiniKit class not available after all attempts";
            await debugLog("❌ Final failure", { errorMsg });
            if (isMounted) setInitError(errorMsg);
            return;
          }
        }

        await debugLog("✅ MiniKit class is available", {
          miniKitType: typeof MiniKit,
          miniKitMethods: Object.getOwnPropertyNames(MiniKit)
        });

        // Simple installation
        try {
          if (typeof MiniKit.install === "function") {
            await debugLog("🔧 Calling MiniKit.install()");
            MiniKit.install({
              appId: "app_10719845a0977ef63ebe8eb9edb890ad",
            });
            await debugLog("✅ MiniKit.install() called successfully");
          } else {
            await debugLog("⚠️ MiniKit.install is not a function, but continuing...");
          }
        } catch (installError) {
          await debugLog("⚠️ MiniKit.install failed, but continuing", {
            error: installError instanceof Error ? installError.message : String(installError)
          });
        }

        // Make MiniKit globally available
        if (typeof window !== 'undefined') {
          window.MiniKit = MiniKit as any;
          await debugLog("✅ MiniKit set on window object");
        }

        // Make sure the global instance is available
        window.MiniKit = MiniKit as any; // Type cast to avoid type conflicts

        console.log("MiniKit installed, waiting for commands to be ready...");

        // Register event handlers for wallet auth
        if (typeof window.MiniKit.on === "function") {
          // Register event handlers for wallet auth events
          handleWalletAuthStart = (data: any) => {
            console.log("Wallet auth started", data);
          };

          handleWalletAuthComplete = (payload: any) => {
            console.log("Wallet auth completed:", payload);
          };

          handleWalletAuthError = (error: any) => {
            console.error("Wallet auth error:", error);
          };

          // Register these handlers
          window.MiniKit.on("wallet-auth-start", handleWalletAuthStart);
          window.MiniKit.on("wallet-auth-complete", handleWalletAuthComplete);
          window.MiniKit.on("wallet-auth-error", handleWalletAuthError);

          console.log("Wallet auth event handlers registered");
        } else {
          console.warn(
            "MiniKit.on is not a function, event handling may not work"
          );
        }

        // Configure MiniKit action handler using multiple approaches
        console.log("Setting up MiniKit action handlers...");

        // Method 1: Set global handler function (most reliable)
        (window as any).handleMiniAppSendTransaction = async (payload: any) => {
          console.log("🔗 Global MiniKit send-transaction handler called:", payload);
          console.log("🌍 Current origin:", window.location.origin);
          console.log("🌍 Current href:", window.location.href);

          try {
            // Use absolute URL to handle ngrok tunneling
            const apiUrl = `${window.location.origin}/api/minikit`;
            console.log("📡 Calling API at:", apiUrl);

            const response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "MiniKit-Handler"
              },
              body: JSON.stringify({ payload }),
            });

            if (!response.ok) {
              throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log("✅ Global handler response:", result);
            return result;
          } catch (error) {
            console.error("❌ Global handler error:", error);
            return {
              status: "error",
              error_code: "handler_error",
              error_message: "Failed to process transaction",
            };
          }
        };

        // Method 2: Set on MiniKit object directly
        if (window.MiniKit) {
          (window.MiniKit as any).handleSendTransaction = (window as any).handleMiniAppSendTransaction;
          console.log("✅ MiniKit.handleSendTransaction set");
        }

        // Method 3: Event listener approach
        const handleMiniAppSendTransaction = async (event: any) => {
          console.log("🔗 Event listener send-transaction received:", event.detail || event);
          return (window as any).handleMiniAppSendTransaction(event.detail || event);
        };

        if (typeof window.addEventListener === "function") {
          window.addEventListener("miniapp-send-transaction", handleMiniAppSendTransaction);
          console.log("✅ Event listener registered for miniapp-send-transaction");
        }

        // Method 4: Try MiniKit subscribe if available
        if (window.MiniKit && typeof window.MiniKit.subscribe === "function") {
          try {
            window.MiniKit.subscribe("miniapp-send-transaction", handleMiniAppSendTransaction);
            console.log("✅ MiniKit.subscribe registered");
          } catch (e) {
            console.warn("MiniKit.subscribe failed:", e);
          }
        }

        // Method 5: Set handler on window.MiniKit.handlers
        if (window.MiniKit) {
          if (!(window.MiniKit as any).handlers) {
            (window.MiniKit as any).handlers = {};
          }
          (window.MiniKit as any).handlers["miniapp-send-transaction"] = (window as any).handleMiniAppSendTransaction;
          console.log("✅ MiniKit.handlers set");
        }

        // Store handler reference for cleanup
        (window as any).__miniKitHandlers = {
          sendTransaction: handleMiniAppSendTransaction,
          global: (window as any).handleMiniAppSendTransaction
        };

        console.log("🎯 All MiniKit action handler methods configured");

        // Debug: Log available MiniKit methods
        if (window.MiniKit) {
          console.log("🔍 Available MiniKit methods:", Object.keys(window.MiniKit));
          if ((window.MiniKit as any).commands) {
            console.log("🔍 Available MiniKit commands:", Object.keys((window.MiniKit as any).commands));
          }
          if ((window.MiniKit as any).commandsAsync) {
            console.log("🔍 Available MiniKit commandsAsync:", Object.keys((window.MiniKit as any).commandsAsync));
          }
        }

        // Debug: Test if our handlers are accessible
        console.log("🔍 Global handler accessible:", typeof (window as any).handleMiniAppSendTransaction);
        console.log("🔍 MiniKit handler accessible:", typeof (window.MiniKit as any)?.handleSendTransaction);

        // Give commands time to initialize
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if commands are available
        const checkCommands = async () => {
          await debugLog("🔍 Checking MiniKit commands availability");

          if (!window.MiniKit) {
            await debugLog("❌ MiniKit not available in window");
            return false;
          }

          if (!window.MiniKit.commands) {
            await debugLog("❌ MiniKit commands not available", {
              windowMiniKitKeys: Object.keys(window.MiniKit)
            });
            return false;
          }

          const availableCommands = Object.keys(window.MiniKit.commands);
          await debugLog("📋 Available MiniKit commands", { availableCommands });

          if (availableCommands.includes("walletAuth")) {
            await debugLog("✅ walletAuth command is available!");
            return true;
          } else {
            await debugLog("❌ walletAuth command not found", { availableCommands });
            return false;
          }
        };

        // First check
        if (!(await checkCommands())) {
          await debugLog("⏳ Commands not ready, waiting longer...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Reinstall MiniKit
          await debugLog("🔄 Reinstalling MiniKit...");
          if (typeof MiniKit.install === "function") {
            MiniKit.install();
          }

          // Wait again
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Check again
          const commandsAvailable = await checkCommands();

          if (!commandsAvailable && isMounted) {
            await debugLog("⚠️ walletAuth command still not available after retry");

            // If we've tried less than max attempts, try again
            if (initAttempts.current < maxAttempts) {
              await debugLog(`🔄 Scheduling retry ${initAttempts.current + 1}/${maxAttempts}...`);
              setTimeout(initializeMiniKit, 2000);
              return false;
            } else {
              await debugLog(`❌ Failed to initialize MiniKit after ${maxAttempts} attempts`);
            }
          }

          return commandsAvailable;
        }

        if (isMounted) {
          setIsInitialized(true);
          await debugLog("🎉 MiniKit initialization complete!");

          // Check if running inside World App
          const isInstalledCheck =
            typeof MiniKit.isInstalled === "function"
              ? MiniKit.isInstalled()
              : false;
          await debugLog("🌍 Running inside World App check", { isInstalledCheck });

          return true;
        }

        return false;
      } catch (e) {
        console.error("MiniKit initialization error:", e);

        // If we've tried less than max attempts, try again
        if (initAttempts.current < maxAttempts) {
          console.log(
            `Scheduling retry after error ${
              initAttempts.current + 1
            }/${maxAttempts}...`
          );
          setTimeout(initializeMiniKit, 2000);
        } else {
          console.error(
            `Failed to initialize MiniKit after ${maxAttempts} attempts due to errors`
          );
        }

        return false;
      }
    };

    // Start initialization
    initializeMiniKit();

    // Cleanup function
    return () => {
      isMounted = false;

      // Clean up event handlers
      if (window.MiniKit && typeof window.MiniKit.off === "function") {
        if (handleWalletAuthStart) {
          window.MiniKit.off("wallet-auth-start", handleWalletAuthStart);
        }
        if (handleWalletAuthComplete) {
          window.MiniKit.off("wallet-auth-complete", handleWalletAuthComplete);
        }
        if (handleWalletAuthError) {
          window.MiniKit.off("wallet-auth-error", handleWalletAuthError);
        }
      }

      // Clean up MiniKit action handlers
      if (typeof window.removeEventListener === "function" && (window as any).__miniKitHandlers) {
        const handlers = (window as any).__miniKitHandlers;
        if (handlers.sendTransaction) {
          window.removeEventListener("miniapp-send-transaction", handlers.sendTransaction);
        }
        delete (window as any).__miniKitHandlers;
      }

      // Clean up global handlers
      if ((window as any).handleMiniAppSendTransaction) {
        delete (window as any).handleMiniAppSendTransaction;
      }

      // Clean up MiniKit handlers
      if (window.MiniKit) {
        delete (window.MiniKit as any).handleSendTransaction;
        if ((window.MiniKit as any).handlers) {
          delete (window.MiniKit as any).handlers["miniapp-send-transaction"];
        }
      }

      console.log("Cleaning up MiniKit provider");
    };
  }, []);

  // Show loading state during initialization
  if (!isInitialized && !initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Initializing MiniKit...</p>
          <p className="mt-1 text-xs text-gray-500">Attempt {initAttempts.current}/{maxAttempts}</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            MiniKit Initialization Failed
          </h2>
          <p className="text-gray-600 mb-4">
            {initError}
          </p>
          <button
            onClick={() => {
              setInitError(null);
              setIsInitialized(false);
              initAttempts.current = 0;
              // Trigger re-initialization
              window.location.reload();
            }}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Retry Initialization
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
