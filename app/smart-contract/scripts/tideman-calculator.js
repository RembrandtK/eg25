/**
 * Tideman Method (Ranked-Pair Tallying) Calculator
 * 
 * Implements the complete Tideman algorithm:
 * 1. Read votes from contract
 * 2. Create pairwise tallies
 * 3. Calculate margins and rank pairs
 * 4. Lock pairs (avoiding cycles)
 * 5. Determine final ranking
 */

class TidemanCalculator {
  constructor(contractReader) {
    this.contractReader = contractReader;
    this.candidates = [];
    this.votes = [];
    this.pairwiseTallies = new Map();
    this.rankedPairs = [];
    this.lockedPairs = new Set();
    this.finalRanking = [];
  }

  /**
   * Stage 1: Read all votes from the contract
   */
  async readVotes() {
    console.log("📊 Stage 1: Reading votes from contract...");
    
    const data = await this.contractReader.getAllVotes();
    this.candidates = data.candidates;
    this.votes = data.votes;
    
    console.log(`Found ${this.votes.length} votes for ${this.candidates.length} candidates`);
    return {
      candidates: this.candidates,
      votes: this.votes,
      totalVoters: data.totalVoters
    };
  }

  /**
   * Stage 2: Create pairwise tallies from individual votes
   */
  createPairwiseTallies() {
    console.log("🔄 Stage 2: Creating pairwise tallies...");
    
    // Initialize pairwise tally matrix
    this.pairwiseTallies.clear();
    for (const candidateA of this.candidates) {
      for (const candidateB of this.candidates) {
        if (candidateA.id !== candidateB.id) {
          const key = `${candidateA.id}-${candidateB.id}`;
          this.pairwiseTallies.set(key, 0);
        }
      }
    }

    // Process each vote
    for (const vote of this.votes) {
      this._processSingleVote(vote.ranking);
    }

    console.log(`Created ${this.pairwiseTallies.size} pairwise comparisons`);
    return this._getPairwiseTalliesObject();
  }

  /**
   * Process a single vote for pairwise tallies
   */
  _processSingleVote(ranking) {
    // Handle ties by grouping candidates at the same rank level
    const rankGroups = this._groupByRank(ranking);
    
    // Compare each rank group against all lower rank groups
    for (let i = 0; i < rankGroups.length; i++) {
      for (let j = i + 1; j < rankGroups.length; j++) {
        const higherGroup = rankGroups[i];
        const lowerGroup = rankGroups[j];
        
        // Each candidate in higher group beats each candidate in lower group
        for (const higherCandidate of higherGroup) {
          for (const lowerCandidate of lowerGroup) {
            const key = `${higherCandidate}-${lowerCandidate}`;
            const currentTally = this.pairwiseTallies.get(key) || 0;
            this.pairwiseTallies.set(key, currentTally + 1);
          }
        }
      }
    }
  }

  /**
   * Group candidates by rank level, handling ties
   */
  _groupByRank(ranking) {
    const groups = [];
    let currentGroup = [];
    
    for (let i = 0; i < ranking.length; i++) {
      const entry = ranking[i];
      
      if (i === 0 || !entry.tiedWithPrevious) {
        // Start new rank group
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [entry.candidateId];
      } else {
        // Add to current rank group (tied)
        currentGroup.push(entry.candidateId);
      }
    }
    
    // Add final group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Stage 3: Calculate margins and rank pairs by strength
   */
  calculateMargins() {
    console.log("📈 Stage 3: Calculating margins and ranking pairs...");
    
    const pairs = [];
    const processedPairs = new Set();
    
    for (const candidateA of this.candidates) {
      for (const candidateB of this.candidates) {
        if (candidateA.id !== candidateB.id) {
          const pairKey = [candidateA.id, candidateB.id].sort().join('-');
          
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);
            
            const aBeatsB = this.pairwiseTallies.get(`${candidateA.id}-${candidateB.id}`) || 0;
            const bBeatsA = this.pairwiseTallies.get(`${candidateB.id}-${candidateA.id}`) || 0;
            
            if (aBeatsB !== bBeatsA) { // Only include if there's a clear winner
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
    
    // Sort pairs by margin (strongest defeats first)
    this.rankedPairs = pairs.sort((a, b) => b.margin - a.margin);
    
    console.log(`Found ${this.rankedPairs.length} decisive pairs`);
    return this.rankedPairs;
  }

  /**
   * Stage 4: Lock pairs in order, avoiding cycles
   */
  lockPairs() {
    console.log("🔒 Stage 4: Locking pairs (avoiding cycles)...");
    
    this.lockedPairs.clear();
    
    for (const pair of this.rankedPairs) {
      // Check if locking this pair would create a cycle
      if (!this._wouldCreateCycle(pair)) {
        this.lockedPairs.add(`${pair.winner}-${pair.loser}`);
        console.log(`  Locked: ${pair.winner} beats ${pair.loser} (margin: ${pair.margin})`);
      } else {
        console.log(`  Skipped: ${pair.winner} beats ${pair.loser} (would create cycle)`);
      }
    }
    
    console.log(`Locked ${this.lockedPairs.size} pairs`);
    return Array.from(this.lockedPairs);
  }

  /**
   * Check if adding a pair would create a cycle
   */
  _wouldCreateCycle(newPair) {
    // Temporarily add the new pair
    const tempLocked = new Set(this.lockedPairs);
    tempLocked.add(`${newPair.winner}-${newPair.loser}`);
    
    // Check for cycles using DFS
    const visited = new Set();
    const recursionStack = new Set();
    
    for (const candidateId of this.candidates.map(c => c.id)) {
      if (!visited.has(candidateId)) {
        if (this._hasCycleDFS(candidateId, tempLocked, visited, recursionStack)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * DFS cycle detection
   */
  _hasCycleDFS(node, lockedPairs, visited, recursionStack) {
    visited.add(node);
    recursionStack.add(node);
    
    // Find all nodes that this node points to
    for (const pair of lockedPairs) {
      const [winner, loser] = pair.split('-').map(Number);
      if (winner === node) {
        if (!visited.has(loser)) {
          if (this._hasCycleDFS(loser, lockedPairs, visited, recursionStack)) {
            return true;
          }
        } else if (recursionStack.has(loser)) {
          return true; // Back edge found - cycle detected
        }
      }
    }
    
    recursionStack.delete(node);
    return false;
  }

  /**
   * Stage 5: Determine final ranking from locked pairs
   */
  determineFinalRanking() {
    console.log("🏆 Stage 5: Determining final ranking...");
    
    // Create adjacency list from locked pairs
    const graph = new Map();
    const inDegree = new Map();
    
    // Initialize
    for (const candidate of this.candidates) {
      graph.set(candidate.id, []);
      inDegree.set(candidate.id, 0);
    }
    
    // Build graph from locked pairs
    for (const pair of this.lockedPairs) {
      const [winner, loser] = pair.split('-').map(Number);
      graph.get(winner).push(loser);
      inDegree.set(loser, inDegree.get(loser) + 1);
    }
    
    // Topological sort (Kahn's algorithm)
    const queue = [];
    const result = [];
    
    // Find all nodes with no incoming edges
    for (const [candidateId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(candidateId);
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift();
      result.push(current);
      
      // Remove edges from current node
      for (const neighbor of graph.get(current)) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    this.finalRanking = result.map((candidateId, index) => ({
      rank: index + 1,
      candidateId,
      candidate: this.candidates.find(c => c.id === candidateId)
    }));
    
    console.log("Final ranking:", this.finalRanking.map(r => `${r.rank}. ${r.candidate.name}`));
    return this.finalRanking;
  }

  /**
   * Run complete Tideman algorithm
   */
  async calculate() {
    const stage1 = await this.readVotes();
    const stage2 = this.createPairwiseTallies();
    const stage3 = this.calculateMargins();
    const stage4 = this.lockPairs();
    const stage5 = this.determineFinalRanking();
    
    return {
      votes: stage1,
      pairwiseTallies: stage2,
      rankedPairs: stage3,
      lockedPairs: stage4,
      finalRanking: stage5,
      winner: this.finalRanking[0]?.candidate
    };
  }

  /**
   * Helper: Convert pairwise tallies to object format
   */
  _getPairwiseTalliesObject() {
    const result = {};
    for (const [key, value] of this.pairwiseTallies) {
      result[key] = value;
    }
    return result;
  }
}

module.exports = { TidemanCalculator };
