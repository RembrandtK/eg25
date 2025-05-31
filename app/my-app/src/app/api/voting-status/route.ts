import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { worldchainSepolia } from "viem/chains";
import { ELECTION_MANAGER_ADDRESS, PEER_RANKING_ADDRESS } from "@/config/dynamic-contracts";

// Simplified ABI for the functions we need
const PEER_RANKING_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserRanking",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "candidateA", "type": "uint256"}, {"internalType": "uint256", "name": "candidateB", "type": "uint256"}],
    "name": "getComparisonCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalRankers",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const ELECTION_MANAGER_ABI = [
  {
    "inputs": [],
    "name": "candidateCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "candidates",
    "outputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "bool", "name": "active", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Create public client for reading contract state
const publicClient = createPublicClient({
  chain: worldchainSepolia,
  transport: http(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');
    const action = searchParams.get('action') || 'overview';

    console.log(`📊 Voting status request: action=${action}, address=${userAddress}`);

    switch (action) {
      case 'user-ranking':
        if (!userAddress) {
          return NextResponse.json({ error: 'Address required for user ranking' }, { status: 400 });
        }
        return await getUserRanking(userAddress);

      case 'comparison-matrix':
        return await getComparisonMatrix();

      case 'overview':
      default:
        return await getVotingOverview(userAddress);
    }
  } catch (error) {
    console.error('Error fetching voting status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voting status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getUserRanking(userAddress: string) {
  try {
    const ranking = await publicClient.readContract({
      address: PEER_RANKING_ADDRESS as `0x${string}`,
      abi: PEER_RANKING_ABI,
      functionName: 'getUserRanking',
      args: [userAddress as `0x${string}`],
    });

    return NextResponse.json({
      userAddress,
      ranking: ranking.map(id => Number(id)),
      hasRanking: ranking.length > 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user ranking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user ranking', userAddress },
      { status: 500 }
    );
  }
}

async function getComparisonMatrix() {
  try {
    // Get candidate count first
    const candidateCount = await publicClient.readContract({
      address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
      abi: ELECTION_MANAGER_ABI,
      functionName: 'candidateCount',
    });

    const count = Number(candidateCount);
    const matrix: { [key: string]: { [key: string]: number } } = {};

    // Build comparison matrix
    for (let i = 1; i <= count; i++) {
      matrix[i.toString()] = {};
      for (let j = 1; j <= count; j++) {
        if (i !== j) {
          const comparisonCount = await publicClient.readContract({
            address: PEER_RANKING_ADDRESS as `0x${string}`,
            abi: PEER_RANKING_ABI,
            functionName: 'getComparisonCount',
            args: [BigInt(i), BigInt(j)],
          });
          matrix[i.toString()][j.toString()] = Number(comparisonCount);
        } else {
          matrix[i.toString()][j.toString()] = 0;
        }
      }
    }

    return NextResponse.json({
      candidateCount: count,
      comparisonMatrix: matrix,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching comparison matrix:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison matrix' },
      { status: 500 }
    );
  }
}

async function getVotingOverview(userAddress?: string | null) {
  try {
    // Get total rankers
    const totalRankers = await publicClient.readContract({
      address: PEER_RANKING_ADDRESS as `0x${string}`,
      abi: PEER_RANKING_ABI,
      functionName: 'getTotalRankers',
    });

    // Get candidate count
    const candidateCount = await publicClient.readContract({
      address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
      abi: ELECTION_MANAGER_ABI,
      functionName: 'candidateCount',
    });

    const overview: any = {
      totalRankers: Number(totalRankers),
      candidateCount: Number(candidateCount),
      timestamp: new Date().toISOString()
    };

    // If user address provided, get their ranking too
    if (userAddress) {
      try {
        const userRanking = await publicClient.readContract({
          address: PEER_RANKING_ADDRESS as `0x${string}`,
          abi: PEER_RANKING_ABI,
          functionName: 'getUserRanking',
          args: [userAddress as `0x${string}`],
        });

        overview.userRanking = {
          address: userAddress,
          ranking: userRanking.map(id => Number(id)),
          hasRanking: userRanking.length > 0
        };
      } catch (error) {
        console.warn('Could not fetch user ranking:', error);
        overview.userRanking = {
          address: userAddress,
          ranking: [],
          hasRanking: false,
          error: 'Could not fetch ranking'
        };
      }
    }

    return NextResponse.json(overview);
  } catch (error) {
    console.error('Error fetching voting overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voting overview' },
      { status: 500 }
    );
  }
}
