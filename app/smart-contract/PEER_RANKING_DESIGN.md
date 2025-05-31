# Peer Ranking Smart Contract Design

## Overview

This document outlines the design evolution for implementing real-time peer ranking functionality for the voting app hackathon. The system will store pairwise comparisons derived from user rankings and update them in real-time as users modify their preferences.

## Design Requirements

### Core Functionality

1. **Real-time Updates**: No submission button - immediate blockchain updates on ranking changes
2. **Pairwise Comparisons**: Store A > B relationships derived from user rankings
3. **Tie Support**: Handle equal rankings (no preference between tied candidates)
4. **Gas Optimization**: Frequent updates require efficient storage and operations
5. **World ID Integration**: Verified users only
6. **Candidate Integration**: Work with existing ElectionManager candidates

### Example Ranking Logic

```text
User Ranking: [Alice, Bob=, Bob=, David]
Rank Numbers: 1, 2=, 2=, 4

Pairwise Comparisons Generated:
- Alice > Bob (Alice ranked higher)
- Alice > Charlie (Alice ranked higher)
- Alice > David (Alice ranked higher)
- Bob > David (Bob ranked higher than David)
- Charlie > David (Charlie ranked higher than David)
- Bob = Charlie (no comparison - tied)
```

## Design Options Explored

### Option 1: Separate PeerRanking Contract
**Pros:**
- Clean separation of concerns
- Independent deployment and upgrades
- Focused functionality
- Easier testing

**Cons:**
- Additional contract deployment
- Cross-contract calls for candidate validation
- More complex integration

### Option 2: Extended ElectionManager Contract
**Pros:**
- Single contract deployment
- Direct candidate access
- Simpler integration
- Lower gas costs for candidate validation

**Cons:**
- Mixed responsibilities
- Harder to upgrade peer ranking logic
- Larger contract size

### Option 3: Hybrid Approach (CHOSEN)
**Pros:**
- Best of both worlds
- PeerRanking contract with ElectionManager interface
- Clean architecture with efficient operations
- Modular design

**Implementation:**

- PeerRanking contract stores comparisons
- ElectionManager interface for candidate validation
- Shared World ID verification

## Smart Contract Architecture

### PeerRanking.sol Structure (UPDATED DESIGN)

```solidity
contract PeerRanking {
    // Efficient vote tracking per user
    mapping(address => uint256[]) public userRankings;  // user -> ordered candidate array
    mapping(address => mapping(uint256 => uint256)) public userCandidateRanks;  // user -> candidate -> rank value

    // Pairwise comparison tallies
    mapping(uint256 => mapping(uint256 => uint256)) public pairwiseComparisons;  // candidateA -> candidateB -> count

    // Integration
    IElectionManager public electionManager;
    IWorldIdAddressBook public worldAddressBook;
}
```

### Ranking Value System

```solidity
// Ranking values (higher = better rank)
uint256 constant MAX_RANK = type(uint256).max;

// Example: User ranks [Alice=1st, Bob=2nd, Carol=2nd, David=4th]
userCandidateRanks[user][Alice] = MAX_RANK;      // First place
userCandidateRanks[user][Bob] = MAX_RANK - 1;    // Second place
userCandidateRanks[user][Carol] = MAX_RANK - 1;  // Tied second place
userCandidateRanks[user][David] = MAX_RANK - 3;  // Fourth place (skips 3rd due to tie)
userCandidateRanks[user][Eve] = 0;               // Unranked (default)
```

### Key Functions

1. **updateRanking(uint256[] newRanking)**
   - Validates user and candidates
   - Removes old rank values and comparisons
   - Sets new rank values (MAX_RANK, MAX_RANK-1, etc.)
   - Adds new pairwise comparisons based on rank values
   - Updates user's current ranking array

2. **getComparisonCount(uint256 candidateA, uint256 candidateB)**
   - Returns how many users prefer A over B

3. **getUserRanking(address user)**
   - Returns user's current ranking array

4. **getUserCandidateRank(address user, uint256 candidateId)**
   - Returns the rank value for a specific candidate

5. **getUserPreference(address user, uint256 candidateA, uint256 candidateB)**
   - Returns -1, 0, or 1 for B preferred, tied/unranked, or A preferred

## Gas Optimization Strategies

### 1. Efficient Storage

- Use bytes32 hash for comparison keys: `keccak256(abi.encodePacked(min(A,B), max(A,B)))`
- Pack comparison data into single storage slot
- Minimize storage writes

### 2. Batch Operations

- Calculate all changes before writing to storage
- Use memory arrays for intermediate calculations
- Single transaction for complete ranking update

### 3. Incremental Updates

- Only update changed comparisons
- Track user's previous ranking to identify differences
- Avoid redundant operations

## Algorithm Implementation

### Pairwise Comparison Generation
```solidity
function generateComparisons(uint256[] memory ranking)
    internal pure returns (bytes32[] memory) {

    bytes32[] memory comparisons = new bytes32[]((ranking.length * (ranking.length - 1)) / 2);
    uint256 index = 0;

    for (uint256 i = 0; i < ranking.length; i++) {
        for (uint256 j = i + 1; j < ranking.length; j++) {
            // Only create comparison if not tied
            if (getRankPosition(ranking, i) != getRankPosition(ranking, j)) {
                uint256 higher = getRankPosition(ranking, i) < getRankPosition(ranking, j)
                    ? ranking[i] : ranking[j];
                uint256 lower = getRankPosition(ranking, i) < getRankPosition(ranking, j)
                    ? ranking[j] : ranking[i];

                comparisons[index] = keccak256(abi.encodePacked(higher, lower));
                index++;
            }
        }
    }

    return comparisons;
}
```

## Testing Strategy

### Unit Tests Required
1. **Basic Functionality**
   - Add/remove single comparisons
   - Handle tie scenarios
   - Validate candidate IDs

2. **Complex Scenarios**
   - Multiple users with different rankings
   - Ranking updates and comparison changes
   - Edge cases (single candidate, all tied)

3. **Gas Optimization**
   - Measure gas costs for different ranking sizes
   - Compare batch vs individual updates
   - Optimize for common use cases

4. **Integration Tests**
   - Work with ElectionManager candidates
   - World ID verification flow
   - Error handling and edge cases

## ✅ Implementation Status

### **COMPLETED ✅**
1. **✅ PeerRanking.sol contract implemented** with efficient vote tracking
2. **✅ Comprehensive unit tests created** (14 test cases, all passing)
3. **✅ Algorithm behavior verified** through testing
4. **✅ Gas optimization confirmed** (~524k initial, ~335k updates)
5. **✅ Error handling implemented** (verification, validation, edge cases)

### **Ready for Next Phase**
- **Deploy to worldchain-sepolia testnet**
- **Integrate with frontend interactive ranking interface**
- **Test real-time blockchain updates**

## 🎯 Key Achievements

### **Algorithm Efficiency**
- **O(1) preference lookup**: `userCandidateRanks[user][candidate]`
- **Simple comparison logic**: `if (rankA > rankB)` determines preference
- **Future algorithm compatibility**: Ready for Condorcet method implementation

### **Gas Performance**
- **Reasonable costs**: ~524k gas for 4-candidate ranking
- **Efficient updates**: ~335k gas for ranking changes
- **Scalable design**: Direct mappings avoid expensive operations

### **Real-time Capability**
- **No submission button**: Immediate blockchain updates
- **Live tally updates**: Pairwise comparisons updated instantly
- **Interactive UX ready**: Perfect for drag-and-drop frontend

## 📋 Next Development Phase

1. **Frontend Integration**: Connect to interactive ranking interface
2. **Deployment**: Deploy to worldchain-sepolia for testing
3. **Real-time Testing**: Verify immediate blockchain updates work smoothly
4. **User Experience**: Test drag-and-drop → blockchain update flow
