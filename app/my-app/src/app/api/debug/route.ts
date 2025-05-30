import { NextRequest, NextResponse } from 'next/server';

interface DebugData {
  timestamp: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  appState: {
    walletConnected: boolean;
    verified: boolean;
    hasVoted: boolean;
  };
  contract: {
    address: string;
    network: string;
  };
  candidates: {
    loading: boolean;
    count: number;
    error: string | null;
    list?: Array<{ name: string; id: string | number }>;
  };
  environment: {
    mode: string;
    origin: string;
  };
  performance?: {
    loadTime?: number;
    renderTime?: number;
  };
}

// Store debug logs in memory (in production, you'd use a proper database)
const debugLogs: Array<DebugData & { id: string }> = [];
const MAX_LOGS = 1000; // Keep last 1000 entries

export async function POST(request: NextRequest) {
  try {
    const debugData: DebugData = await request.json();
    
    // Add metadata
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...debugData,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'Unknown',
    };

    // Add to logs
    debugLogs.push(logEntry);
    
    // Keep only the most recent logs
    if (debugLogs.length > MAX_LOGS) {
      debugLogs.splice(0, debugLogs.length - MAX_LOGS);
    }

    // Log to server console for immediate monitoring
    console.log('🐛 DEBUG DATA RECEIVED:', {
      timestamp: logEntry.timestamp,
      sessionId: debugData.sessionId,
      walletConnected: debugData.appState.walletConnected,
      verified: debugData.appState.verified,
      hasVoted: debugData.appState.hasVoted,
      candidatesCount: debugData.candidates.count,
      candidatesError: debugData.candidates.error,
      url: debugData.url,
      userAgent: logEntry.userAgent?.slice(0, 50) + '...',
    });

    // Log errors with more detail
    if (debugData.candidates.error) {
      console.error('🚨 CANDIDATE LOADING ERROR:', {
        error: debugData.candidates.error,
        timestamp: logEntry.timestamp,
        sessionId: debugData.sessionId,
      });
    }

    // Log successful votes
    if (debugData.appState.hasVoted) {
      console.log('🗳️ VOTE DETECTED:', {
        timestamp: logEntry.timestamp,
        sessionId: debugData.sessionId,
        candidatesCount: debugData.candidates.count,
      });
    }

    return NextResponse.json({ 
      success: true, 
      logId: logEntry.id,
      totalLogs: debugLogs.length 
    });

  } catch (error) {
    console.error('❌ Error processing debug data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process debug data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const sessionId = url.searchParams.get('sessionId');
    
    let filteredLogs = debugLogs;
    
    // Filter by session ID if provided
    if (sessionId) {
      filteredLogs = debugLogs.filter(log => log.sessionId === sessionId);
    }
    
    // Get most recent logs
    const recentLogs = filteredLogs
      .slice(-limit)
      .reverse(); // Most recent first

    return NextResponse.json({
      success: true,
      logs: recentLogs,
      totalLogs: debugLogs.length,
      filteredCount: filteredLogs.length,
    });

  } catch (error) {
    console.error('❌ Error fetching debug logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debug logs' },
      { status: 500 }
    );
  }
}
