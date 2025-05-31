"use client";

import { useState, useEffect, useRef } from "react";
import { ELECTION_MANAGER_ADDRESS } from "@/config/dynamic-contracts";

interface DebugPanelProps {
  candidates?: any[];
  loading?: boolean;
  error?: string | null;
  walletConnected?: boolean;
  verified?: boolean;
  hasVoted?: boolean;
}

export function DebugPanel({
  candidates = [],
  loading = false,
  error = null,
  walletConnected = false,
  verified = false,
  hasVoted = false
}: DebugPanelProps) {
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const sessionId = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);

  // Generate debug data
  const generateDebugData = () => ({
    sessionId: sessionId.current,
    url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    appState: {
      walletConnected,
      verified,
      hasVoted,
    },
    contract: {
      address: ELECTION_MANAGER_ADDRESS,
      network: 'worldchain-sepolia (4801)',
    },
    candidates: {
      loading,
      count: candidates.length,
      error,
      list: candidates.slice(0, 5).map((c, i) => ({
        id: typeof c.id === 'bigint' ? c.id.toString() : (c.id || i),
        name: c.name || 'Unknown'
      })),
    },
    environment: {
      mode: process.env.NODE_ENV || 'development',
      origin: typeof window !== 'undefined' ? window.location.origin : 'SSR',
    },
    performance: {
      loadTime: typeof window !== 'undefined' ? performance.now() : 0,
    },
  });

  // Send debug data to server
  const sendDebugData = async () => {
    if (sendStatus === 'sending') return;

    setSendStatus('sending');
    try {
      const debugData = generateDebugData();
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(debugData, (_key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Debug data sent successfully:', result);
        setSendStatus('success');
        setTimeout(() => setSendStatus('idle'), 2000);
      } else {
        const errorText = await response.text();
        console.error('❌ Debug data send failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        setSendStatus('error');
        setTimeout(() => setSendStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('❌ Failed to send debug data:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        debugData: generateDebugData(),
      });
      setSendStatus('error');
      setTimeout(() => setSendStatus('idle'), 3000);
    }
  };

  // Auto-send debug data when important state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      sendDebugData();
    }, 1000); // Debounce rapid changes

    return () => clearTimeout(timer);
  }, [walletConnected, verified, hasVoted, candidates.length, error]);

  // Hide UI but keep server-side logging functionality
  // The useEffect above will continue to send debug data to the server
  return null;
}
