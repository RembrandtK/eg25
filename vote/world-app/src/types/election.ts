// Election and Candidate types for the World Mini App

export interface Candidate {
  id: bigint;
  name: string;
  description: string;
  active: boolean;
}

export interface Election {
  id: bigint;
  address: `0x${string}`;
  name: string;
  description: string;
  worldIdAction: string;
  isActive: boolean;
  creator: `0x${string}`;
  endTime: bigint;
  totalVoters?: bigint;
  candidateCount?: bigint;
}

export interface VoteData {
  candidateIds: bigint[];
  signal?: string;
}

export interface RankingEntry {
  candidateId: bigint;
  rank: number;
}

export interface TidemanResults {
  winner: Candidate | null;
  rankedPairs: Array<{
    winner: number;
    loser: number;
    margin: number;
    winnerVotes: number;
    loserVotes: number;
  }>;
  finalRanking: Candidate[];
  eliminationOrder: number[];
  lockedPairs: Array<{
    winner: number;
    loser: number;
  }>;
}

export interface ElectionInfo {
  title: string;
  description: string;
  totalVoters: number;
  candidateCount: number;
}

export interface UseElectionManagerOptions {
  autoLoad?: boolean;
  refreshInterval?: number;
}
