/**
 * Simple unit tests for voting logic and data transformation
 */

// Test the core voting data transformation logic
describe('Voting Data Processing', () => {
  // Function to convert candidate IDs to ranking entries (extracted from hook)
  function createRankingEntries(rankedCandidateIds: bigint[]): Array<{candidateId: number, tiedWithPrevious: boolean}> {
    return rankedCandidateIds.map(id => ({
      candidateId: Number(id),
      tiedWithPrevious: false  // No ties for now
    }));
  }

  // Function to create World ID signal (extracted from hook)
  function createWorldIdSignal(rankedCandidateIds: bigint[]): string {
    const voteData = rankedCandidateIds.map(id => Number(id));
    return JSON.stringify(voteData);
  }

  // Function to validate vote data
  function validateVoteData(rankedCandidateIds: bigint[]): { isValid: boolean, error?: string } {
    if (rankedCandidateIds.length === 0) {
      return { isValid: false, error: 'No candidates ranked' };
    }

    // Check for duplicates
    const uniqueIds = new Set(rankedCandidateIds.map(id => id.toString()));
    if (uniqueIds.size !== rankedCandidateIds.length) {
      return { isValid: false, error: 'Duplicate candidates in ranking' };
    }

    return { isValid: true };
  }

  it('should create ranking entries correctly', () => {
    const candidateIds = [1n, 3n, 2n];
    const rankingEntries = createRankingEntries(candidateIds);

    expect(rankingEntries).toEqual([
      { candidateId: 1, tiedWithPrevious: false },
      { candidateId: 3, tiedWithPrevious: false },
      { candidateId: 2, tiedWithPrevious: false },
    ]);
  });

  it('should create World ID signal correctly', () => {
    const candidateIds = [1n, 3n, 2n];
    const signal = createWorldIdSignal(candidateIds);

    expect(signal).toBe('[1,3,2]');
  });

  it('should handle empty candidate list', () => {
    const rankingEntries = createRankingEntries([]);
    const signal = createWorldIdSignal([]);

    expect(rankingEntries).toEqual([]);
    expect(signal).toBe('[]');
  });

  it('should validate vote data correctly', () => {
    // Valid vote
    expect(validateVoteData([1n, 2n, 3n])).toEqual({ isValid: true });

    // Empty vote
    expect(validateVoteData([])).toEqual({
      isValid: false,
      error: 'No candidates ranked'
    });

    // Duplicate candidates
    expect(validateVoteData([1n, 2n, 1n])).toEqual({
      isValid: false,
      error: 'Duplicate candidates in ranking'
    });
  });

  it('should handle large candidate IDs', () => {
    const largeCandidateIds = [999999999n, 1000000000n];
    const rankingEntries = createRankingEntries(largeCandidateIds);
    const signal = createWorldIdSignal(largeCandidateIds);

    expect(rankingEntries).toEqual([
      { candidateId: 999999999, tiedWithPrevious: false },
      { candidateId: 1000000000, tiedWithPrevious: false },
    ]);
    expect(signal).toBe('[999999999,1000000000]');
  });

});
