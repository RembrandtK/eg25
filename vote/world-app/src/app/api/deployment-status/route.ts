import { NextRequest, NextResponse } from "next/server";
import { CURRENT_NETWORK, ELECTION_MANAGER_ADDRESS, MOCK_WORLD_ID_ADDRESS } from "@/config/contracts";

/**
 * Deployment Status API
 * Provides information about contract deployments and addresses
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const chainId = searchParams.get('chainId');

    console.log(`🔍 Deployment status request: action=${action}, chainId=${chainId}`);

    // Simplified deployment status using the main contracts config
    const status = {
      chainId: CURRENT_NETWORK.chainId,
      networkName: CURRENT_NETWORK.name,
      rpcUrl: CURRENT_NETWORK.rpcUrl,
      contractAddresses: {
        ElectionManager: ELECTION_MANAGER_ADDRESS,
        MockWorldID: MOCK_WORLD_ID_ADDRESS,
      }
    };

    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          ...status,
          timestamp: new Date().toISOString()
        });

      case 'refresh':
        // No cache to refresh in simplified version
        return NextResponse.json({
          success: true,
          message: "Using static configuration (no cache to refresh)",
          ...status,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("❌ Deployment status error:", error);
    return NextResponse.json(
      { 
        error: "Failed to get deployment status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
