"use client"; // Required for Next.js

import { ReactNode, useEffect, useState, useRef } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

// Access to window.MiniKit for direct debugging access
declare global {
  interface Window {
    MiniKit: typeof MiniKit & {
      commands?: Record<string, any>;
      commandsAsync?: Record<string, any>;
      install?: (appId?: string) => void;
      walletAddress?: string | null;
      user?: {
        username?: string | null;
        profilePictureUrl?: string | null;
      };
      on?: (event: string, callback: Function) => void;
      off?: (event: string, callback: Function) => void;
      isInstalled?: () => boolean;
    };
  }
}

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const initAttempts = useRef(0);
  const maxAttempts = 3;

  useEffect(() => {
    let isMounted = true;
    // Event handler references that need to be cleaned up
    let handleWalletAuthStart: Function | null = null;
    let handleWalletAuthComplete: Function | null = null;
    let handleWalletAuthError: Function | null = null;

    // Function to install MiniKit and ensure it's ready to use
    const initializeMiniKit = async () => {
      try {
        initAttempts.current += 1;
        console.log(
          `Attempting to initialize MiniKit (attempt ${initAttempts.current})...`
        );

        // Make sure MiniKit class is available
        if (!MiniKit) {
          console.error("MiniKit class not available");
          return false;
        }

        // Install MiniKit with app configuration
        if (typeof MiniKit.install === "function") {
          MiniKit.install({
            appId: "app_10719845a0977ef63ebe8eb9edb890ad",
            actionId: "vote",
          });
        } else {
          console.error("MiniKit.install is not a function");
          return false;
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

          try {
            const response = await fetch("/api/minikit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payload }),
            });

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

        // Give commands time to initialize
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if commands are available
        const checkCommands = () => {
          if (!window.MiniKit) {
            console.error("MiniKit not available in window");
            return false;
          }

          if (!window.MiniKit.commands) {
            console.error("MiniKit commands not available");
            return false;
          }

          const availableCommands = Object.keys(window.MiniKit.commands);
          console.log("Available MiniKit commands:", availableCommands);

          if (availableCommands.includes("walletAuth")) {
            console.log("walletAuth command is available!");
            return true;
          } else {
            console.warn("walletAuth command not found in:", availableCommands);
            return false;
          }
        };

        // First check
        if (!checkCommands()) {
          console.log("Commands not ready, waiting longer...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Reinstall MiniKit
          console.log("Reinstalling MiniKit...");
          if (typeof MiniKit.install === "function") {
            MiniKit.install();
          }

          // Wait again
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Check again
          const commandsAvailable = checkCommands();

          if (!commandsAvailable && isMounted) {
            console.warn("walletAuth command still not available after retry");

            // If we've tried less than max attempts, try again
            if (initAttempts.current < maxAttempts) {
              console.log(
                `Scheduling retry ${initAttempts.current + 1}/${maxAttempts}...`
              );
              setTimeout(initializeMiniKit, 2000);
              return false;
            } else {
              console.error(
                `Failed to initialize MiniKit after ${maxAttempts} attempts`
              );
            }
          }

          return commandsAvailable;
        }

        if (isMounted) {
          setIsInitialized(true);
          console.log("MiniKit initialization complete");

          // Check if running inside World App
          const isInstalledCheck =
            typeof MiniKit.isInstalled === "function"
              ? MiniKit.isInstalled()
              : false;
          console.log("Running inside World App:", isInstalledCheck);

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

  return <>{children}</>;
}
