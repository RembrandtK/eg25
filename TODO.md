# Voting App Hackathon — Interactive Ranking & Peer Tallying

MUST:

1. Keep updating this file with latest plans and tasks to work from.
2. Regularly commit and push changes being made.
3. Keep design doc of approach that evolves and is referenced.
4. Keep going on resolving issues.

## 🎯 Project Overview

**NEW REQUIREMENTS**: Interactive ranking system with real-time peer tallying where users can:

1. Build up a ranked list of candidates interactively from unranked candidates
2. Reorder candidates with drag-and-drop, supporting ties (equal ranks)
3. Update peer-based ranking tallies in real-time (no submission button)
4. Store peer comparisons on-chain via smart contract

## 🏗️ Architecture & Design

### Current Smart Contract

- **ElectionManager.sol** deployed to worldchain-sepolia: `0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7`
- 4 test candidates: Alice Johnson, Bob Smith, Carol Davis, David Wilson

### Peer Ranking Smart Contract

- **Separate contract** for storing peer comparison tallies
- Live updates without submission button
- Compatible with future Condorcet/Ranked Pairs algorithms

- **Unranked Candidates Pool**: Bottom section showing available candidates
- **Ranked Candidates List**: Top section showing current ranking with proper numbering
- **Interactive Ranking**: Add candidates from pool to ranked list
- **Tie Support**: Equal ranks (2=, 2=, 4) with proper numbering
- **Real-time Updates**: Immediate peer tally updates on reordering

## 🚨 **CRITICAL REQUIREMENT: REGULAR COMMITS**

**MUST commit and push changes regularly throughout development!**

- After completing each task or significant change
- Before switching between major components
- At least every 30 minutes of active development

### � CRITICAL ISSUES TO FIX IMMEDIATELY

4. **Test Framework Issues (URGENT)**
   - [ ] Fix Hardhat Chai matchers configuration (24 failing tests)
   - [ ] Install @nomicfoundation/hardhat-chai-matchers properly
   - [ ] Fix BigInt comparison issues in tests
   - [ ] Ensure all contract tests pass before proceeding

5. **Contract Reading Failures (URGENT)**
   - [ ] Verify PeerRanking contract deployment on Worldchain Sepolia
   - [ ] Test RPC connectivity: `https://worldchain-sepolia.g.alchemy.com/public`
   - [ ] Fix `getUserRanking(address)` function calls
   - [ ] Test contract reading with different RPC endpoints

6. **Mock Transaction Mode (HIGH PRIORITY)**
   - [ ] Remove mock transaction simulation in `usePeerRanking.ts`
   - [ ] Fix MiniKit action handler registration
   - [ ] Enable real blockchain writes with proper error handling
   - [ ] Test transaction persistence between app sessions

7. **Gas Optimization (MEDIUM PRIORITY)**
   - [ ] Optimize large ranking operations (currently 1.9M gas for 10 candidates)
   - [ ] Implement batching for multiple ranking updates
   - [ ] Test gas costs on World Chain mainnet vs testnet

### 🚀 FUTURE ENHANCEMENTS (Post-Hackathon)

6. **Multiple Elections System**
   - [ ] Design election factory contract pattern
   - [ ] Each election = separate smart contract instance
   - [ ] Elections tab with list of available elections
   - [ ] Election creation and management interface
   - [ ] Cross-election analytics and comparison

7. **Advanced Ranking Features**
   - [ ] Tie support with proper numbering (1, 2=, 2=, 4)
   - [ ] Drag-and-drop tie creation
   - [ ] Condorcet method result calculation
   - [ ] Ranked pairs algorithm implementation

8. **Analytics & Visualization**
   - [ ] Real-time comparison tallies display
   - [ ] Voting pattern visualization
   - [ ] Election results dashboard
   - [ ] Historical voting data analysis

### 🔧 Technical Implementation Notes

- **No Submission Button**: All ranking changes trigger immediate blockchain updates
- **Pairwise Logic**: For ranking [A, B=, B=, D], generate: A>B, A>C, A>D, B>D, C>D
- **Tie Handling**: Equal-ranked candidates don't have pairwise preferences between them
- **Future Compatibility**: Design for Condorcet method / Ranked Pairs algorithm integration

## 🔧 Technical Details

- **Current Contract**: `0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7` on worldchain-sepolia
- **World ID App**: `app_10719845a0977ef63ebe8eb9edb890ad`
- **Development**: `pnpm dev` at localhost:3000

## 📚 Research References

- [Condorcet Method](https://en.wikipedia.org/wiki/Condorcet_method) for future algorithm implementation
- Ranked peer voting principles for pairwise comparison design
