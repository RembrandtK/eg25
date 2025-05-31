# TDD Approach for Mini App Contract Interactions

## Overview
This document outlines a Test-Driven Development approach for implementing and verifying Mini App interactions with smart contracts, focusing on proper World ID verification and ranking functionality.

## Core Principles

### 1. Test-First Development
- Write failing tests that describe the exact behavior we want
- Implement minimal code to make tests pass
- Refactor while keeping tests green
- Each test should verify a specific interaction or behavior

### 2. Real World ID ZK Proof Verification
- Implement proper `verifyProof` ZK proof verification (not mocked)
- Test valid ZK proofs with correct parameters
- Test invalid ZK proofs (wrong nullifier, signal, etc.)
- Test proof replay attacks (nullifier reuse)
- Test proof parameter validation (root, groupId, etc.)
- Verify signal hash matches expected voting action
- Test external nullifier hash for voting context

### 3. Contract Interaction Patterns
- Test the exact sequence of calls the Mini App will make
- Verify state changes after each interaction
- Test error conditions and proper error messages
- Ensure gas usage is reasonable for mobile users

## Test Structure

### Phase 1: Core Contract Functionality Tests

#### A. World ID ZK Proof Verification Tests

```javascript
describe("World ID ZK Proof Verification", () => {
  it("should accept valid ZK proofs with correct parameters")
  it("should reject invalid ZK proofs (wrong nullifier)")
  it("should reject invalid ZK proofs (wrong signal hash)")
  it("should reject invalid ZK proofs (wrong root)")
  it("should reject invalid ZK proofs (wrong group ID)")
  it("should prevent proof replay attacks (nullifier reuse)")
  it("should validate external nullifier hash for voting context")
  it("should verify signal hash matches voting action")
  it("should handle malformed proof arrays")
  it("should validate proof parameter ranges")
})
```

#### B. Candidate Management Tests
```javascript
describe("Candidate Management", () => {
  it("should load candidates correctly on app startup")
  it("should validate candidate IDs in rankings")
  it("should handle inactive candidates")
  it("should return proper candidate metadata")
})
```

#### C. Ranking Storage Tests
```javascript
describe("Ranking Storage", () => {
  it("should store user rankings correctly")
  it("should handle ranking updates (user changes mind)")
  it("should support partial rankings")
  it("should handle tie scenarios")
  it("should validate ranking structure")
})
```

### Phase 2: Mini App Workflow Tests

#### A. Complete User Journey Tests
```javascript
describe("Mini App User Journey", () => {
  it("should handle first-time user flow")
  it("should handle returning user with existing ranking")
  it("should handle user updating their ranking")
  it("should handle user with expired World ID")
})
```

#### B. Data Persistence Tests
```javascript
describe("Data Persistence", () => {
  it("should persist rankings across sessions")
  it("should load user's previous ranking on app restart")
  it("should handle ranking history/timestamps")
  it("should export data for off-chain analysis")
})
```

#### C. Real-time Updates Tests
```javascript
describe("Real-time Updates", () => {
  it("should update statistics after each vote")
  it("should handle concurrent voting")
  it("should maintain data consistency")
})
```

### Phase 3: Integration & Performance Tests

#### A. Gas Optimization Tests
```javascript
describe("Gas Optimization", () => {
  it("should use reasonable gas for typical operations")
  it("should optimize gas for ranking updates")
  it("should handle large rankings efficiently")
})
```

#### B. Error Handling Tests
```javascript
describe("Error Handling", () => {
  it("should provide clear error messages")
  it("should handle network failures gracefully")
  it("should validate input data properly")
})
```

## Implementation Strategy

### Step 1: Define Contract Interfaces
1. **ElectionManager**: Candidate management and basic voting status
2. **SimpleRanking**: Ranking storage without complex tallying
3. **World ID Integration**: Proper verification flow

### Step 2: Write Failing Tests
For each contract interaction the Mini App needs:
1. Write a test that describes the expected behavior
2. Run the test (it should fail)
3. Implement minimal contract code to make it pass
4. Refactor and optimize

### Step 3: Contract Design Decisions

#### ElectionManager Responsibilities:
- Candidate CRUD operations
- Voting period management
- Basic election metadata
- **NOT responsible for**: Complex tallying, pairwise comparisons

#### SimpleRanking Responsibilities:
- Store user rankings with timestamps
- World ID verification enforcement
- Basic ranking validation
- Data export for off-chain analysis
- **NOT responsible for**: Condorcet calculations, winner determination

#### Off-chain Analysis:
- Condorcet winner calculation
- Complex election analysis
- Reporting and visualization
- Historical data analysis

### Step 4: Test Categories

#### Unit Tests (Contract Level)
- Individual function behavior
- Input validation
- State changes
- Error conditions

#### Integration Tests (Multi-Contract)
- ElectionManager + SimpleRanking interactions
- World ID verification flow
- Complete voting workflow

#### End-to-End Tests (Mini App Simulation)
- Full user journey simulation
- Real transaction flows
- Gas usage validation
- Performance benchmarks

## Test Data Strategy

### Consistent Test Candidates
```javascript
const TEST_CANDIDATES = [
  { name: "Alice Johnson", description: "Community development leader" },
  { name: "Bob Smith", description: "Technology and education advocate" },
  { name: "Carol Davis", description: "Environmental sustainability champion" },
  { name: "David Wilson", description: "Economic policy expert" }
];
```

### Test User Scenarios
1. **First-time voter**: Never voted before
2. **Returning voter**: Has existing ranking
3. **Updating voter**: Changes their ranking
4. **Expired verification**: World ID expired
5. **Unverified user**: Never verified with World ID

### Test Ranking Scenarios
1. **Full ranking**: All candidates ranked
2. **Partial ranking**: Only top preferences
3. **Tied ranking**: Some candidates tied
4. **Single candidate**: Only one preference
5. **Updated ranking**: User changes their mind

## Success Criteria

### Functional Requirements
- ✅ World ID verification works correctly
- ✅ Rankings are stored and retrievable
- ✅ Users can update their rankings
- ✅ Data can be exported for off-chain analysis
- ✅ Gas usage is reasonable for mobile users

### Non-Functional Requirements
- ✅ Tests run quickly (< 30 seconds for full suite)
- ✅ Clear error messages for all failure cases
- ✅ Code coverage > 95%
- ✅ Documentation matches implementation

### Mini App Integration Requirements
- ✅ All Mini App interactions have corresponding tests
- ✅ Contract interfaces match Mini App expectations
- ✅ Error handling supports good UX
- ✅ Performance is suitable for mobile devices

## Implementation Order

1. **World ID Verification Tests** → Core security requirement
2. **Basic Ranking Storage Tests** → Core functionality
3. **Candidate Management Tests** → Data foundation
4. **Complete Workflow Tests** → Integration validation
5. **Performance & Gas Tests** → Optimization
6. **Error Handling Tests** → Robustness
7. **Off-chain Export Tests** → Analysis support

## Next Steps

1. Review and approve this approach
2. Implement Phase 1 tests (failing tests first)
3. Build minimal contracts to pass tests
4. Iterate through phases with continuous feedback
5. Validate against actual Mini App requirements

This TDD approach ensures we build exactly what the Mini App needs, with proper verification, and avoid over-engineering or missing critical functionality.
