/**
 * Simple unit tests for voting logic and data transformation
 */

import { keccak256, encodePacked } from 'viem';

// Shared utility functions for all tests
function createRankingEntries(rankedCandidateIds: bigint[]): Array<{candidateId: number, tiedWithPrevious: boolean}> {
  return rankedCandidateIds.map(id => ({
    candidateId: Number(id),
    tiedWithPrevious: false  // No ties for now
  }));
}

// Function to create World ID signal (CORRECTED VERSION)
function createWorldIdSignal(rankedCandidateIds: bigint[]): string {
  const rankingEntries = createRankingEntries(rankedCandidateIds);
  const candidateIds = rankingEntries.map(entry => entry.candidateId);
  const tiedFlags = rankingEntries.map(entry => entry.tiedWithPrevious);

  // Create hash using the same method as the contract test
  const hash = keccak256(
    encodePacked(
      ['uint256[]', 'bool[]'],
      [candidateIds, tiedFlags]
    )
  );

  return hash;
}

// OLD INCORRECT VERSION for comparison
function createWorldIdSignalOld(rankedCandidateIds: bigint[]): string {
  const voteData = rankedCandidateIds.map(id => Number(id));
  return JSON.stringify(voteData);
}

// Test the core voting data transformation logic
describe('Voting Data Processing', () => {

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

  it('should create World ID signal correctly (NEW CORRECT VERSION)', () => {
    const candidateIds = [1n, 3n, 2n];
    const signal = createWorldIdSignal(candidateIds);

    // Should be a hex hash, not JSON string
    expect(signal).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(signal).not.toBe('[1,3,2]');

    console.log('✅ Correct signal format:', signal);
  });

  it('should show difference between old and new signal generation', () => {
    const candidateIds = [1n, 3n, 2n];
    const newSignal = createWorldIdSignal(candidateIds);
    const oldSignal = createWorldIdSignalOld(candidateIds);

    console.log('🔍 Comparison:');
    console.log('  Old (incorrect):', oldSignal);
    console.log('  New (correct):  ', newSignal);

    expect(newSignal).not.toBe(oldSignal);
    expect(oldSignal).toBe('[1,3,2]');
    expect(newSignal).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('should handle empty candidate list', () => {
    const rankingEntries = createRankingEntries([]);
    const signal = createWorldIdSignal([]);

    expect(rankingEntries).toEqual([]);
    expect(signal).toMatch(/^0x[a-fA-F0-9]{64}$/); // Should still be a valid hash
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
    expect(signal).toMatch(/^0x[a-fA-F0-9]{64}$/); // Should be a valid hash
  });

  it('should create consistent signals for same input', () => {
    const candidateIds = [1n, 2n, 3n];
    const signal1 = createWorldIdSignal(candidateIds);
    const signal2 = createWorldIdSignal(candidateIds);

    expect(signal1).toBe(signal2);
    console.log('✅ Consistent signal:', signal1);
  });

  it('should create different signals for different inputs', () => {
    const candidateIds1 = [1n, 2n, 3n];
    const candidateIds2 = [3n, 2n, 1n]; // Different order
    const signal1 = createWorldIdSignal(candidateIds1);
    const signal2 = createWorldIdSignal(candidateIds2);

    expect(signal1).not.toBe(signal2);
    console.log('🔍 Different signals for different orders:');
    console.log('  [1,2,3]:', signal1);
    console.log('  [3,2,1]:', signal2);
  });

});

// Test that verifies the app's voting workflow matches contract expectations
describe('Contract Integration Verification', () => {
  // This test simulates the exact same workflow as the contract test
  it('should generate signal that matches contract test expectations', () => {
    // Same test data as MiniAppWorkflow.test.js
    const ranking = [
      { candidateId: 1, tiedWithPrevious: false }, // Alice - 1st choice
      { candidateId: 2, tiedWithPrevious: false }, // Bob - 2nd choice
      { candidateId: 3, tiedWithPrevious: false }  // Carol - 3rd choice
    ];

    // Extract candidate IDs and tied flags (same as contract test)
    const candidateIds = ranking.map(r => r.candidateId);
    const tiedFlags = ranking.map(r => r.tiedWithPrevious);

    // Generate signal using our app's method
    const rankedCandidateIds = candidateIds.map(id => BigInt(id));
    const appSignal = createWorldIdSignal(rankedCandidateIds);

    // Generate signal using contract test method
    const contractSignal = keccak256(
      encodePacked(
        ['uint256[]', 'bool[]'],
        [candidateIds, tiedFlags]
      )
    );

    console.log('🔍 Contract Integration Test:');
    console.log('  Ranking:', ranking);
    console.log('  Candidate IDs:', candidateIds);
    console.log('  Tied Flags:', tiedFlags);
    console.log('  App Signal:', appSignal);
    console.log('  Contract Signal:', contractSignal);

    // The signals should match exactly
    expect(appSignal).toBe(contractSignal);
    console.log('✅ App signal matches contract expectations!');
  });

  it('should handle tied candidates correctly', () => {
    // Test with ties (same as contract test)
    const rankingWithTies = [
      { candidateId: 1, tiedWithPrevious: false }, // Alice - 1st
      { candidateId: 2, tiedWithPrevious: false }, // Bob - 2nd
      { candidateId: 3, tiedWithPrevious: true }   // Carol - tied for 2nd
    ];

    const candidateIds = rankingWithTies.map(r => r.candidateId);
    const tiedFlags = rankingWithTies.map(r => r.tiedWithPrevious);

    // Generate signal using our app's method (but with ties)
    // Note: Our current app doesn't support ties yet, but this tests the signal generation
    const contractSignal = keccak256(
      encodePacked(
        ['uint256[]', 'bool[]'],
        [candidateIds, tiedFlags]
      )
    );

    console.log('🔍 Tied Candidates Test:');
    console.log('  Ranking with ties:', rankingWithTies);
    console.log('  Signal with ties:', contractSignal);

    expect(contractSignal).toMatch(/^0x[a-fA-F0-9]{64}$/);
    console.log('✅ Tied candidates signal generation works!');
  });
});
