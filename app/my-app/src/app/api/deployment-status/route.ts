import { NextRequest, NextResponse } from "next/server";
import { getDeploymentStatus, refreshDeploymentCache } from "@/config/dynamic-contracts";

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

    switch (action) {
      case 'status':
        const status = getDeploymentStatus(chainId ? parseInt(chainId) : undefined);
        return NextResponse.json({
          success: true,
          ...status,
          timestamp: new Date().toISOString()
        });

      case 'refresh':
        refreshDeploymentCache();
        const refreshedStatus = getDeploymentStatus(chainId ? parseInt(chainId) : undefined);
        return NextResponse.json({
          success: true,
          message: "Deployment cache refreshed",
          ...refreshedStatus,
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
