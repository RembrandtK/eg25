import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { worldchainSepolia } from "viem/chains";
import { CURRENT_NETWORK, ELECTION_MANAGER_ADDRESS } from "@/config/contracts";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Testing RPC configuration...");
    console.log("CURRENT_NETWORK.rpcUrl:", CURRENT_NETWORK.rpcUrl);
    console.log("ELECTION_MANAGER_ADDRESS:", ELECTION_MANAGER_ADDRESS);

    // Test creating a public client
    const publicClient = createPublicClient({
      chain: worldchainSepolia,
      transport: http(CURRENT_NETWORK.rpcUrl, {
        retryCount: 3,
        retryDelay: 2000,
      }),
    });

    console.log("✅ Public client created successfully");

    // Test a simple contract call
    const chainId = await publicClient.getChainId();
    console.log("✅ Chain ID:", chainId);

    // Test the ElectionManager contract
    const electionCount = await publicClient.readContract({
      address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
      abi: [
        {
          "inputs": [],
          "name": "electionCount",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "electionCount",
    });

    console.log("✅ Election count:", electionCount);

    return NextResponse.json({
      success: true,
      rpcUrl: CURRENT_NETWORK.rpcUrl,
      chainId,
      electionManagerAddress: ELECTION_MANAGER_ADDRESS,
      electionCount: electionCount.toString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ RPC test failed:", error);
    return NextResponse.json(
      { 
        error: "RPC test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        rpcUrl: CURRENT_NETWORK.rpcUrl,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
