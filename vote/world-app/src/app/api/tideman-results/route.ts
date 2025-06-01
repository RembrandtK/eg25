import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { worldchainSepolia } from "viem/chains";
import { ELECTION_MANAGER_ADDRESS, CURRENT_NETWORK } from "@/config/contracts";
import { Candidate } from "@/lib/candidateLoader";

// Election contract ABI for reading votes
const ELECTION_ABI = [
  {
    "inputs": [],
    "name": "getAllVoters",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "voterId", "type": "uint256"}],
    "name": "getVote",
    "outputs": [{"components": [{"internalType": "uint256", "name": "candidateId", "type": "uint256"}, {"internalType": "bool", "name": "tiedWithPrevious", "type": "bool"}], "internalType": "struct Election.RankingEntry[]", "name": "", "type": "tuple[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCandidates",
    "outputs": [{"components": [{"internalType": "uint256", "name": "id", "type": "uint256"}, {"internalType": "string", "name": "name", "type": "string"}, {"internalType": "string", "name": "description", "type": "string"}, {"internalType": "bool", "name": "active", "type": "bool"}], "internalType": "struct Election.Candidate[]", "name": "", "type": "tuple[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getElectionInfo",
    "outputs": [
      {"internalType": "string", "name": "_title", "type": "string"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "string", "name": "_worldIdAction", "type": "string"},
      {"internalType": "address", "name": "_creator", "type": "address"},
      {"internalType": "uint256", "name": "_createdAt", "type": "uint256"},
      {"internalType": "bool", "name": "_votingActive", "type": "bool"},
      {"internalType": "uint256", "name": "_candidateCount", "type": "uint256"},
      {"internalType": "uint256", "name": "_totalVoters", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Create public client
const publicClient = createPublicClient({
  chain: worldchainSepolia,
  transport: http(CURRENT_NETWORK.rpcUrl, {
    retryCount: 3,
    retryDelay: 1000,
  }),
});

// Using Candidate interface from candidateLoader

interface RankingEntry {
  candidateId: number;
  tiedWithPrevious: boolean;
}

interface Vote {
  voterId: number;
  ranking: RankingEntry[];
}

interface TidemanResults {
  algorithm: string;
  winner?: Candidate;
  finalRanking: Array<{
    rank: number;
    candidate: Candidate;
    score?: number;
  }>;
  pairwiseTallies: { [key: string]: number };
  rankedPairs: Array<{
    winner: number;
    loser: number;
    margin: number;
    winnerVotes: number;
    loserVotes: number;
  }>;
  lockedPairs: string[];
  metadata: {
    totalVoters: number;
    candidateCount: number;
    timestamp: string;
    description: string;
    calculationTimeMs: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('🗳️ Calculating Tideman results (using established graph-based method)...');
    const startTime = Date.now();

    // Get election data
    const [candidates, voters, electionInfo] = await Promise.all([
      getCandidates(),
      getAllVoters(),
      getElectionInfo()
    ]);

    if (voters.length === 0) {
      return NextResponse.json({
        error: 'No votes have been cast yet',
        totalVoters: 0,
        candidateCount: candidates.length
      }, { status: 200 });
    }

    // Read all votes
    const votes: Vote[] = [];
    for (const voterId of voters) {
      try {
        const vote = await getVote(voterId);
        if (vote.length > 0) {
          votes.push({ voterId, ranking: vote });
        }
      } catch (error) {
        console.warn(`Failed to read vote for voter ${voterId}:`, error);
      }
    }

    // Calculate Tideman results
    const results = calculateTidemanResults(candidates, votes);
    const endTime = Date.now();

    const tidemanResults: TidemanResults = {
      algorithm: 'Tideman Method (Ranked Pairs)',
      winner: results.finalRanking[0]?.candidate,
      finalRanking: results.finalRanking,
      pairwiseTallies: results.pairwiseTallies,
      rankedPairs: results.rankedPairs,
      lockedPairs: results.lockedPairs,
      metadata: {
        totalVoters: voters.length,
        candidateCount: candidates.length,
        timestamp: new Date().toISOString(),
        description: 'Established Tideman method (graph-based) - proven Condorcet criterion and democratic properties',
        calculationTimeMs: endTime - startTime
      }
    };

    return NextResponse.json(tidemanResults);
  } catch (error) {
    console.error('Error calculating Tideman results:', error);
    return NextResponse.json(
      { error: 'Failed to calculate Tideman results', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getCandidates(): Promise<Candidate[]> {
  const candidates = await publicClient.readContract({
    address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
    abi: ELECTION_ABI,
    functionName: 'getCandidates',
  });

  return candidates.map(candidate => ({
    id: Number(candidate.id),
    name: candidate.name,
    description: candidate.description,
    active: candidate.active
  })).filter(c => c.active);
}

async function getAllVoters(): Promise<number[]> {
  const voters = await publicClient.readContract({
    address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
    abi: ELECTION_ABI,
    functionName: 'getAllVoters',
  });
  return voters.map(voterId => Number(voterId));
}

async function getVote(voterId: number): Promise<RankingEntry[]> {
  const vote = await publicClient.readContract({
    address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
    abi: ELECTION_ABI,
    functionName: 'getVote',
    args: [BigInt(voterId)],
  });

  return vote.map(entry => ({
    candidateId: Number(entry.candidateId),
    tiedWithPrevious: entry.tiedWithPrevious
  }));
}

async function getElectionInfo() {
  const info = await publicClient.readContract({
    address: ELECTION_MANAGER_ADDRESS as `0x${string}`,
    abi: ELECTION_ABI,
    functionName: 'getElectionInfo',
  });

  return {
    title: info._title,
    description: info._description,
    totalVoters: Number(info._totalVoters),
    candidateCount: Number(info._candidateCount)
  };
}

function calculateTidemanResults(candidates: Candidate[], votes: Vote[]) {
  // Stage 1: Create pairwise tallies
  const pairwiseTallies: { [key: string]: number } = {};
  
  // Initialize tallies
  for (const candidateA of candidates) {
    for (const candidateB of candidates) {
      if (candidateA.id !== candidateB.id) {
        pairwiseTallies[`${candidateA.id}-${candidateB.id}`] = 0;
      }
    }
  }

  // Process each vote
  for (const vote of votes) {
    const rankGroups = groupByRank(vote.ranking);
    
    // Compare each rank group against all lower rank groups
    for (let i = 0; i < rankGroups.length; i++) {
      for (let j = i + 1; j < rankGroups.length; j++) {
        const higherGroup = rankGroups[i];
        const lowerGroup = rankGroups[j];
        
        for (const higherCandidate of higherGroup) {
          for (const lowerCandidate of lowerGroup) {
            const key = `${higherCandidate}-${lowerCandidate}`;
            pairwiseTallies[key] = (pairwiseTallies[key] || 0) + 1;
          }
        }
      }
    }
  }

  // Stage 2: Calculate margins and rank pairs
  const pairs = [];
  const processedPairs = new Set();
  
  for (const candidateA of candidates) {
    for (const candidateB of candidates) {
      if (candidateA.id !== candidateB.id) {
        const pairKey = [candidateA.id, candidateB.id].sort().join('-');
        
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          
          const aBeatsB = pairwiseTallies[`${candidateA.id}-${candidateB.id}`] || 0;
          const bBeatsA = pairwiseTallies[`${candidateB.id}-${candidateA.id}`] || 0;
          
          if (aBeatsB !== bBeatsA) {
            const margin = Math.abs(aBeatsB - bBeatsA);
            const winner = aBeatsB > bBeatsA ? candidateA.id : candidateB.id;
            const loser = aBeatsB > bBeatsA ? candidateB.id : candidateA.id;
            
            pairs.push({
              winner,
              loser,
              margin,
              winnerVotes: Math.max(aBeatsB, bBeatsA),
              loserVotes: Math.min(aBeatsB, bBeatsA)
            });
          }
        }
      }
    }
  }

  const rankedPairs = pairs.sort((a, b) => b.margin - a.margin);

  // Stage 3: Lock pairs (avoiding cycles)
  const lockedPairs: string[] = [];
  
  for (const pair of rankedPairs) {
    if (!wouldCreateCycle(pair, lockedPairs, candidates)) {
      lockedPairs.push(`${pair.winner}-${pair.loser}`);
    }
  }

  // Stage 4: Determine final ranking
  const finalRanking = determineFinalRanking(candidates, lockedPairs);

  return {
    pairwiseTallies,
    rankedPairs,
    lockedPairs,
    finalRanking
  };
}

function groupByRank(ranking: RankingEntry[]): number[][] {
  const groups: number[][] = [];
  let currentGroup: number[] = [];
  
  for (let i = 0; i < ranking.length; i++) {
    const entry = ranking[i];
    
    if (i === 0 || !entry.tiedWithPrevious) {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
      }
      currentGroup = [entry.candidateId];
    } else {
      currentGroup.push(entry.candidateId);
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}

function wouldCreateCycle(newPair: any, lockedPairs: string[], candidates: Candidate[]): boolean {
  const tempLocked = new Set([...lockedPairs, `${newPair.winner}-${newPair.loser}`]);
  
  const visited = new Set();
  const recursionStack = new Set();
  
  for (const candidate of candidates) {
    if (!visited.has(candidate.id)) {
      if (hasCycleDFS(candidate.id, tempLocked, visited, recursionStack)) {
        return true;
      }
    }
  }
  
  return false;
}

function hasCycleDFS(node: number, lockedPairs: Set<string>, visited: Set<number>, recursionStack: Set<number>): boolean {
  visited.add(node);
  recursionStack.add(node);
  
  for (const pair of lockedPairs) {
    const [winner, loser] = pair.split('-').map(Number);
    if (winner === node) {
      if (!visited.has(loser)) {
        if (hasCycleDFS(loser, lockedPairs, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(loser)) {
        return true;
      }
    }
  }
  
  recursionStack.delete(node);
  return false;
}

function determineFinalRanking(candidates: Candidate[], lockedPairs: string[]) {
  const graph = new Map<number, number[]>();
  const inDegree = new Map<number, number>();
  
  // Initialize
  for (const candidate of candidates) {
    graph.set(candidate.id, []);
    inDegree.set(candidate.id, 0);
  }
  
  // Build graph
  for (const pair of lockedPairs) {
    const [winner, loser] = pair.split('-').map(Number);
    graph.get(winner)!.push(loser);
    inDegree.set(loser, inDegree.get(loser)! + 1);
  }
  
  // Topological sort
  const queue: number[] = [];
  const result: number[] = [];
  
  for (const [candidateId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(candidateId);
    }
  }
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    
    for (const neighbor of graph.get(current)!) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  return result.map((candidateId, index) => ({
    rank: index + 1,
    candidate: candidates.find(c => c.id === candidateId)!
  }));
}
