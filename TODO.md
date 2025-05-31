# Voting App Hackathon — Interactive Ranking & Peer Tallying

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

### NEW: Peer Ranking Smart Contract (Required)
- **Separate contract** for storing peer comparison tallies
- Matrix of pairwise comparisons (A > B, B > C, etc.)
- Live updates without submission button
- Compatible with future Condorcet/Ranked Pairs algorithms

### Frontend Components (Major Redesign Required)

#### Current Implementation
- Bottom Navigation: Two-tab interface (Candidates / My Ranking)
- CandidatesTab: Displays candidate list from contract
- RankingTab: Drag-and-drop interface for ranking candidates

#### NEW Requirements
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
- Always commit before asking for help or reporting issues

## 📋 HACKATHON TASKS

### ✅ COMPLETED TASKS

1. **✅ Smart Contract Development**
   - ✅ Design peer comparison matrix contract (PeerRanking.sol)
   - ✅ Implement pairwise comparison storage with efficient vote tracking
   - ✅ Deploy to worldchain-sepolia testnet: `0x2caDc553c4B98863A3937fF0E710b79F7E855d8a`
   - ✅ Comprehensive testing (14 test cases, all passing)

2. **✅ Core Interactive Ranking Interface**
   - ✅ Create two-section layout: ranked list (top) + unranked pool (bottom)
   - ✅ Add/remove candidates between pools
   - ✅ Reorder candidates within ranked list
   - ✅ Real-time blockchain updates (no submission button)

3. **✅ Frontend-Contract Integration**
   - ✅ Connect ranking interface to peer tally contract
   - ✅ Handle transaction states with user feedback
   - ✅ Debounced updates for gas optimization
   - ✅ Error handling and success notifications

### 🔥 CURRENT PRIORITY: Testing & Polish

4. **Frontend Integration Testing**
   - [ ] Test complete interactive ranking flow
   - [ ] Verify real-time blockchain updates work
   - [ ] Test gas costs on World Chain mainnet
   - [ ] Polish user experience and animations

5. **User Experience Enhancements**
   - [ ] Smooth animations for ranking changes
   - [ ] Visual feedback for blockchain updates
   - [ ] Loading states optimization
   - [ ] Mobile responsiveness testing

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
