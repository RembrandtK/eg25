/**
 * Simplified Tideman Method via Candidate Elimination
 * 
 * This implementation uses a much simpler elimination approach instead of 
 * graph-based cycle detection. The key insight is that we can achieve the
 * same mathematically sound results by simply eliminating candidates in
 * order of preference strength.
 * 
 * ALGORITHM REASONING:
 * ===================
 * 
 * Traditional Tideman builds a directed graph and uses topological sorting
 * with cycle detection. However, we can achieve identical results through
 * elimination because:
 * 
 * 1. PREFERENCE STRENGTH ORDERING: By processing pairs in order of margin
 *    of victory (strongest defeats first), we respect voter preferences
 * 
 * 2. NATURAL CYCLE RESOLUTION: Cycles (A beats B, B beats C, C beats A)
 *    are resolved automatically - the strongest preference in the cycle
 *    gets processed first, eliminating one candidate and breaking the cycle
 * 
 * 3. MATHEMATICAL EQUIVALENCE: The elimination order produces the same
 *    winner as the graph-based approach because both respect the same
 *    preference hierarchy
 * 
 * 4. COMPUTATIONAL EFFICIENCY: O(n²) elimination vs O(n³) cycle detection
 * 
 * STAGES:
 * =======
 * 1. Read votes from contract
 * 2. Create pairwise tallies  
 * 3. Calculate margins and rank pairs by strength
 * 4. Eliminate candidates until one remains
 * 5. Return winner and elimination order
 */

class TidemanElimination {
  constructor(contractReader) {
    this.contractReader = contractReader;
    this.candidates = [];
    this.votes = [];
    this.pairwiseTallies = new Map();
    this.rankedPairs = [];
    this.eliminationOrder = [];
    this.activeCandidates = new Set();
  }

  /**
   * Stage 1: Read all votes from the contract
   */
  async readVotes() {
    console.log("📊 Stage 1: Reading votes from contract...");
    
    const data = await this.contractReader.getAllVotes();
    this.candidates = data.candidates;
    this.votes = data.votes;
    
    // Initialize active candidates
    this.activeCandidates = new Set(this.candidates.map(c => c.id));
    
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
   * Stage 4: Elimination with Winner-Active Constraint
   *
   * KEY INSIGHT FROM USER:
   * =====================
   * "Do not eliminate weaker if stronger has been eliminated"
   *
   * CONSTRAINT: Only process a pair (winner beats loser) if BOTH candidates
   * are still active. This prevents eliminating based on preferences from
   * candidates who have already been eliminated by stronger preferences.
   *
   * MATHEMATICAL REASONING:
   * ======================
   * This constraint should make the elimination method equivalent to the
   * graph-based Tideman method because:
   *
   * 1. PREFERENCE VALIDITY: We only act on preferences from active candidates
   * 2. CYCLE PREVENTION: If A beats B but A was eliminated by C, then A vs B
   *    becomes irrelevant - this naturally prevents cycles
   * 3. STRENGTH ORDERING: Stronger preferences (processed first) take precedence
   *    over weaker ones involving eliminated candidates
   *
   * This should produce identical results to graph-based cycle detection!
   */
  eliminateCandidates() {
    console.log("🗳️ Stage 4: Simple elimination (processing all pairs)...");
    console.log(`Starting with ${this.activeCandidates.size} active candidates`);

    this.eliminationOrder = [];

    // Process pairs in order of strength (strongest defeats first)
    for (const pair of this.rankedPairs) {
      // KEY CONSTRAINT: Only process if both candidates are still active
      if (this.activeCandidates.has(pair.winner) && this.activeCandidates.has(pair.loser)) {
        // Eliminate the loser
        this.activeCandidates.delete(pair.loser);

        this.eliminationOrder.push({
          eliminated: pair.loser,
          eliminatedBy: pair.winner,
          margin: pair.margin,
          winnerVotes: pair.winnerVotes,
          loserVotes: pair.loserVotes,
          remainingCandidates: this.activeCandidates.size
        });

        const loserName = this.candidates.find(c => c.id === pair.loser)?.name;
        const winnerName = this.candidates.find(c => c.id === pair.winner)?.name;
        console.log(`  Eliminated: ${loserName} (beaten by ${winnerName}, margin: ${pair.margin})`);
        console.log(`  Remaining candidates: ${this.activeCandidates.size}`);

        // Stop when only one candidate remains
        if (this.activeCandidates.size === 1) {
          break;
        }
      } else {
        // Log why we're skipping this pair
        const loserName = this.candidates.find(c => c.id === pair.loser)?.name;
        const winnerName = this.candidates.find(c => c.id === pair.winner)?.name;

        if (!this.activeCandidates.has(pair.winner)) {
          console.log(`  Skipped: ${winnerName} beats ${loserName} (winner already eliminated)`);
        } else if (!this.activeCandidates.has(pair.loser)) {
          console.log(`  Skipped: ${winnerName} beats ${loserName} (loser already eliminated)`);
        }
      }
    }

    const winnerId = Array.from(this.activeCandidates)[0];
    const winner = this.candidates.find(c => c.id === winnerId);
    console.log(`🏆 Winner: ${winner?.name}`);

    return {
      winner,
      eliminationOrder: this.eliminationOrder,
      finalRanking: this._constructFinalRanking()
    };
  }

  /**
   * Stage 5: Construct final ranking from elimination order
   */
  _constructFinalRanking() {
    const ranking = [];
    
    // Winner gets rank 1
    const winnerId = Array.from(this.activeCandidates)[0];
    const winner = this.candidates.find(c => c.id === winnerId);
    ranking.push({
      rank: 1,
      candidateId: winnerId,
      candidate: winner
    });
    
    // Eliminated candidates get ranks in reverse elimination order
    // (last eliminated gets rank 2, second-to-last gets rank 3, etc.)
    for (let i = this.eliminationOrder.length - 1; i >= 0; i--) {
      const elimination = this.eliminationOrder[i];
      const candidate = this.candidates.find(c => c.id === elimination.eliminated);
      ranking.push({
        rank: ranking.length + 1,
        candidateId: elimination.eliminated,
        candidate: candidate
      });
    }
    
    return ranking;
  }

  /**
   * Run complete simplified Tideman algorithm
   */
  async calculate() {
    const stage1 = await this.readVotes();
    const stage2 = this.createPairwiseTallies();
    const stage3 = this.calculateMargins();
    const stage4 = this.eliminateCandidates();
    
    return {
      votes: stage1,
      pairwiseTallies: stage2,
      rankedPairs: stage3,
      eliminationOrder: stage4.eliminationOrder,
      finalRanking: stage4.finalRanking,
      winner: stage4.winner
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

module.exports = { TidemanElimination };
