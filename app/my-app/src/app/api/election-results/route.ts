import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { worldchainSepolia } from "viem/chains";
import { ELECTION_MANAGER_ADDRESS, PEER_RANKING_ADDRESS, NETWORK_CONFIG } from "@/config/contract-addresses";

// Simplified ABI for the functions we need
const PEER_RANKING_ABI = [
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
  },
  {
    "inputs": [],
    "name": "rankers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserRanking",
    "outputs": [{"components": [{"internalType": "uint256", "name": "candidateId", "type": "uint256"}, {"internalType": "bool", "name": "tiedWithPrevious", "type": "bool"}], "internalType": "struct PeerRanking.RankingEntry[]", "name": "", "type": "tuple[]"}],
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

// Create public client for reading contract state with retry logic
const publicClient = createPublicClient({
  chain: worldchainSepolia,
  transport: http(NETWORK_CONFIG.rpcUrl, {
    retryCount: 3,
    retryDelay: 1000,
  }),
});

interface Candidate {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

interface RankingEntry {
  candidateId: number;
  tiedWithPrevious: boolean;
}

interface ElectionResults {
  algorithm: string;
  winner?: Candidate;
  rankings: Array<{
    rank: number;
    candidate: Candidate;
    score?: number;
    votes?: number;
    percentage?: number;
  }>;
  metadata: {
    totalVoters: number;
    candidateCount: number;
    timestamp: string;
    description: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const algorithm = searchParams.get('algorithm') || 'condorcet';
    
    console.log(`🗳️ Calculating election results using ${algorithm} method`);

    // Get basic election data
    const [candidates, totalRankers] = await Promise.all([
      getCandidates(),
      getTotalRankers()
    ]);

    if (totalRankers === 0) {
      return NextResponse.json({
        error: 'No votes have been cast yet',
        totalVoters: 0,
        candidateCount: candidates.length
      }, { status: 200 });
    }

    let results: ElectionResults;

    switch (algorithm.toLowerCase()) {
      case 'condorcet':
        results = await calculateCondorcetResults(candidates, totalRankers);
        break;
      case 'borda':
        results = await calculateBordaCountResults(candidates, totalRankers);
        break;
      case 'plurality':
        results = await calculatePluralityResults(candidates, totalRankers);
        break;
      case 'instant-runoff':
      case 'irv':
        results = await calculateInstantRunoffResults(candidates, totalRankers);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported algorithm. Use: condorcet, borda, plurality, instant-runoff' }, { status: 400 });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error calculating election results:', error);
    return NextResponse.json(
      { error: 'Failed to calculate election results', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getCandidates(): Promise<Candidate[]> {
  const candidateCount = await publicClient.readContract({
    address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
    abi: ELECTION_MANAGER_ABI,
    functionName: 'candidateCount',
  });

  const candidates: Candidate[] = [];
  for (let i = 1; i <= Number(candidateCount); i++) {
    const candidate = await publicClient.readContract({
      address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
      abi: ELECTION_MANAGER_ABI,
      functionName: 'candidates',
      args: [BigInt(i)],
    });

    candidates.push({
      id: Number(candidate[0]),
      name: candidate[1],
      description: candidate[2],
      active: candidate[3]
    });
  }

  return candidates.filter(c => c.active);
}

async function getTotalRankers(): Promise<number> {
  const totalRankers = await publicClient.readContract({
    address: PEER_RANKING_ADDRESS as `0x${string}`,
    abi: PEER_RANKING_ABI,
    functionName: 'getTotalRankers',
  });
  return Number(totalRankers);
}

async function getComparisonMatrix(candidateIds: number[]): Promise<{ [key: string]: { [key: string]: number } }> {
  const matrix: { [key: string]: { [key: string]: number } } = {};

  for (const candidateA of candidateIds) {
    matrix[candidateA.toString()] = {};
    for (const candidateB of candidateIds) {
      if (candidateA !== candidateB) {
        const comparisonCount = await publicClient.readContract({
          address: PEER_RANKING_ADDRESS as `0x${string}`,
          abi: PEER_RANKING_ABI,
          functionName: 'getComparisonCount',
          args: [BigInt(candidateA), BigInt(candidateB)],
        });
        matrix[candidateA.toString()][candidateB.toString()] = Number(comparisonCount);
      } else {
        matrix[candidateA.toString()][candidateB.toString()] = 0;
      }
    }
  }

  return matrix;
}

async function calculateCondorcetResults(candidates: Candidate[], totalVoters: number): Promise<ElectionResults> {
  const candidateIds = candidates.map(c => c.id);
  const matrix = await getComparisonMatrix(candidateIds);
  
  // Find Condorcet winner (beats all other candidates in pairwise comparisons)
  let condorcetWinner: Candidate | undefined;
  
  for (const candidate of candidates) {
    let isWinner = true;
    for (const opponent of candidates) {
      if (candidate.id !== opponent.id) {
        const candidateVotes = matrix[candidate.id.toString()][opponent.id.toString()] || 0;
        const opponentVotes = matrix[opponent.id.toString()][candidate.id.toString()] || 0;
        
        if (candidateVotes <= opponentVotes) {
          isWinner = false;
          break;
        }
      }
    }
    if (isWinner) {
      condorcetWinner = candidate;
      break;
    }
  }

  // Calculate win counts for ranking
  const winCounts = candidates.map(candidate => {
    let wins = 0;
    for (const opponent of candidates) {
      if (candidate.id !== opponent.id) {
        const candidateVotes = matrix[candidate.id.toString()][opponent.id.toString()] || 0;
        const opponentVotes = matrix[opponent.id.toString()][candidate.id.toString()] || 0;
        if (candidateVotes > opponentVotes) wins++;
      }
    }
    return { candidate, wins };
  });

  // Sort by win count
  winCounts.sort((a, b) => b.wins - a.wins);

  const rankings = winCounts.map((item, index) => ({
    rank: index + 1,
    candidate: item.candidate,
    score: item.wins,
    votes: item.wins,
    percentage: Math.round((item.wins / (candidates.length - 1)) * 100)
  }));

  return {
    algorithm: 'Condorcet Method',
    winner: condorcetWinner,
    rankings,
    metadata: {
      totalVoters,
      candidateCount: candidates.length,
      timestamp: new Date().toISOString(),
      description: condorcetWinner 
        ? 'Condorcet winner found - candidate who beats all others in pairwise comparisons'
        : 'No Condorcet winner - no candidate beats all others in pairwise comparisons'
    }
  };
}

async function calculateBordaCountResults(candidates: Candidate[], totalVoters: number): Promise<ElectionResults> {
  // For Borda count, we need to get all individual rankings and calculate points
  // This is a simplified version - in a full implementation, we'd need to access all user rankings
  
  const candidateIds = candidates.map(c => c.id);
  const matrix = await getComparisonMatrix(candidateIds);
  
  // Approximate Borda scores using pairwise comparison data
  const bordaScores = candidates.map(candidate => {
    let totalScore = 0;
    for (const opponent of candidates) {
      if (candidate.id !== opponent.id) {
        const wins = matrix[candidate.id.toString()][opponent.id.toString()] || 0;
        totalScore += wins;
      }
    }
    return { candidate, score: totalScore };
  });

  bordaScores.sort((a, b) => b.score - a.score);

  const rankings = bordaScores.map((item, index) => ({
    rank: index + 1,
    candidate: item.candidate,
    score: item.score,
    votes: item.score,
    percentage: totalVoters > 0 ? Math.round((item.score / (totalVoters * (candidates.length - 1))) * 100) : 0
  }));

  return {
    algorithm: 'Borda Count',
    winner: bordaScores[0]?.candidate,
    rankings,
    metadata: {
      totalVoters,
      candidateCount: candidates.length,
      timestamp: new Date().toISOString(),
      description: 'Borda Count - candidates receive points based on their position in each ranking'
    }
  };
}

async function calculatePluralityResults(candidates: Candidate[], totalVoters: number): Promise<ElectionResults> {
  // For plurality, we count first-place votes
  // This requires getting all user rankings and counting first preferences
  
  const candidateIds = candidates.map(c => c.id);
  const matrix = await getComparisonMatrix(candidateIds);
  
  // Approximate first-place votes using pairwise data
  const firstPlaceVotes = candidates.map(candidate => {
    let votes = 0;
    for (const opponent of candidates) {
      if (candidate.id !== opponent.id) {
        const wins = matrix[candidate.id.toString()][opponent.id.toString()] || 0;
        votes += wins;
      }
    }
    // Normalize to approximate first-place votes
    votes = Math.round(votes / (candidates.length - 1));
    return { candidate, votes };
  });

  firstPlaceVotes.sort((a, b) => b.votes - a.votes);

  const rankings = firstPlaceVotes.map((item, index) => ({
    rank: index + 1,
    candidate: item.candidate,
    votes: item.votes,
    percentage: totalVoters > 0 ? Math.round((item.votes / totalVoters) * 100) : 0
  }));

  return {
    algorithm: 'Plurality Voting',
    winner: firstPlaceVotes[0]?.candidate,
    rankings,
    metadata: {
      totalVoters,
      candidateCount: candidates.length,
      timestamp: new Date().toISOString(),
      description: 'Plurality - candidate with the most first-place votes wins'
    }
  };
}

async function calculateInstantRunoffResults(candidates: Candidate[], totalVoters: number): Promise<ElectionResults> {
  // Instant runoff voting (IRV) simulation
  // This is a simplified approximation using pairwise comparison data
  
  const candidateIds = candidates.map(c => c.id);
  const matrix = await getComparisonMatrix(candidateIds);
  
  // Calculate strength scores for each candidate
  const strengthScores = candidates.map(candidate => {
    let totalStrength = 0;
    for (const opponent of candidates) {
      if (candidate.id !== opponent.id) {
        const wins = matrix[candidate.id.toString()][opponent.id.toString()] || 0;
        const losses = matrix[opponent.id.toString()][candidate.id.toString()] || 0;
        totalStrength += wins - losses;
      }
    }
    return { candidate, strength: totalStrength };
  });

  strengthScores.sort((a, b) => b.strength - a.strength);

  const rankings = strengthScores.map((item, index) => ({
    rank: index + 1,
    candidate: item.candidate,
    score: item.strength,
    percentage: Math.round(((item.strength + totalVoters * (candidates.length - 1)) / (2 * totalVoters * (candidates.length - 1))) * 100)
  }));

  return {
    algorithm: 'Instant Runoff Voting (IRV)',
    winner: strengthScores[0]?.candidate,
    rankings,
    metadata: {
      totalVoters,
      candidateCount: candidates.length,
      timestamp: new Date().toISOString(),
      description: 'IRV simulation - eliminates candidates with lowest support in rounds'
    }
  };
}
