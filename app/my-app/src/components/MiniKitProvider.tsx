"use client";

import { ReactNode, useEffect, useState } from "react";

interface MiniKitProviderProps {
  children: ReactNode;
}

export function MiniKitProvider({ children }: MiniKitProviderProps) {
  const [isMiniKit, setIsMiniKit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we're running in MiniKit (World App)
    const checkMiniKit = () => {
      // Check for MiniKit global object
      const hasMiniKit = typeof window !== 'undefined' && 
        (window as any).MiniKit !== undefined;
      
      // Check user agent for World App
      const isWorldApp = typeof window !== 'undefined' && 
        navigator.userAgent.includes('WorldApp');
      
      // Check for specific MiniKit APIs
      const hasMiniKitAPI = typeof window !== 'undefined' && 
        (window as any).MiniKit?.isAppSdkSupported?.();

      const detected = hasMiniKit || isWorldApp || hasMiniKitAPI;
      
      console.log("🔍 MiniKit Detection:", {
        hasMiniKit,
        isWorldApp,
        hasMiniKitAPI,
        detected,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR'
      });

      setIsMiniKit(detected);
      setIsLoading(false);
    };

    // Check immediately
    checkMiniKit();

    // Also check after a short delay in case MiniKit loads asynchronously
    const timer = setTimeout(checkMiniKit, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!isMiniKit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            World App Required
          </h2>
          <p className="text-gray-600 mb-4">
            This Election Mini App is designed to run inside the World App. 
            Please open this link in the World App to participate in voting.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 font-medium mb-2">For Development:</p>
            <p className="text-xs text-gray-600">
              If you're testing locally, the app will still load but some features 
              like World ID verification may not work outside the World App environment.
            </p>
          </div>
          <button
            onClick={() => setIsMiniKit(true)}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            Continue Anyway (Development)
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
