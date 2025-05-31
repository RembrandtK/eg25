const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Vote Reader Utility
 * 
 * This utility reads votes from Election contracts and provides
 * comprehensive vote analysis and ranking capabilities.
 */

// Election contract ABI (minimal required functions)
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
    "name": "getTotalVoters",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
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
];

class VoteReader {
  constructor(contractAddress, provider) {
    this.contractAddress = contractAddress;
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, ELECTION_ABI, provider);
  }

  /**
   * Get all candidates from the election
   */
  async getCandidates() {
    try {
      const candidates = await this.contract.getCandidates();
      return candidates.map(candidate => ({
        id: Number(candidate.id),
        name: candidate.name,
        description: candidate.description,
        active: candidate.active
      }));
    } catch (error) {
      console.error("Error fetching candidates:", error);
      throw error;
    }
  }

  /**
   * Get election metadata
   */
  async getElectionInfo() {
    try {
      const info = await this.contract.getElectionInfo();
      return {
        title: info._title,
        description: info._description,
        worldIdAction: info._worldIdAction,
        creator: info._creator,
        createdAt: Number(info._createdAt),
        votingActive: info._votingActive,
        candidateCount: Number(info._candidateCount),
        totalVoters: Number(info._totalVoters)
      };
    } catch (error) {
      console.error("Error fetching election info:", error);
      throw error;
    }
  }

  /**
   * Get all voter IDs who have voted
   */
  async getAllVoters() {
    try {
      const voters = await this.contract.getAllVoters();
      return voters.map(voterId => Number(voterId));
    } catch (error) {
      console.error("Error fetching voters:", error);
      throw error;
    }
  }

  /**
   * Get vote for a specific voter ID
   */
  async getVote(voterId) {
    try {
      const vote = await this.contract.getVote(voterId);
      return vote.map(entry => ({
        candidateId: Number(entry.candidateId),
        tiedWithPrevious: entry.tiedWithPrevious
      }));
    } catch (error) {
      console.error(`Error fetching vote for voter ${voterId}:`, error);
      throw error;
    }
  }

  /**
   * Get all votes from all voters
   */
  async getAllVotes() {
    try {
      console.log("📊 Reading all votes from contract...");
      
      const [voters, candidates, electionInfo] = await Promise.all([
        this.getAllVoters(),
        this.getCandidates(),
        this.getElectionInfo()
      ]);

      console.log(`Found ${voters.length} voters and ${candidates.length} candidates`);

      const votes = [];
      for (const voterId of voters) {
        try {
          const vote = await this.getVote(voterId);
          if (vote.length > 0) {
            votes.push({
              voterId,
              ranking: vote
            });
          }
        } catch (error) {
          console.warn(`Failed to read vote for voter ${voterId}:`, error.message);
        }
      }

      return {
        electionInfo,
        candidates,
        votes,
        totalVoters: voters.length,
        validVotes: votes.length
      };
    } catch (error) {
      console.error("Error reading all votes:", error);
      throw error;
    }
  }

  /**
   * Get vote statistics
   */
  async getVoteStatistics() {
    try {
      const data = await this.getAllVotes();

      const stats = {
        totalVoters: data.totalVoters,
        validVotes: data.validVotes,
        candidateCount: data.candidates.length,
        averageRankingLength: 0,
        completeRankings: 0,
        partialRankings: 0,
        votesWithTies: 0
      };

      if (data.votes.length > 0) {
        const rankingLengths = data.votes.map(v => v.ranking.length);
        stats.averageRankingLength = rankingLengths.reduce((a, b) => a + b, 0) / rankingLengths.length;
        stats.completeRankings = data.votes.filter(v => v.ranking.length === data.candidates.length).length;
        stats.partialRankings = data.votes.filter(v => v.ranking.length < data.candidates.length).length;
        stats.votesWithTies = data.votes.filter(v => v.ranking.some(r => r.tiedWithPrevious)).length;
      }

      return stats;
    } catch (error) {
      console.error("Error calculating vote statistics:", error);
      throw error;
    }
  }
}

module.exports = { VoteReader };
