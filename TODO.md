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

## 📋 HACKATHON TASKS

### 🔥 Priority 1: Core Interactive Ranking Interface

1. **Redesign UI Layout**
   - [ ] Create two-section layout: ranked list (top) + unranked pool (bottom)
   - [ ] Implement proper rank numbering with tie support (1, 2=, 2=, 4)
   - [ ] Add candidates from unranked pool to ranked list
   - [ ] Remove candidates from ranked list back to unranked pool

2. **Enhanced Drag & Drop**
   - [ ] Drag candidates from unranked pool to ranked list
   - [ ] Reorder candidates within ranked list
   - [ ] Support for creating ties (equal rankings)
   - [ ] Update rank numbers dynamically

### 🔥 Priority 2: Peer Ranking Smart Contract

3. **New Smart Contract Development**
   - [ ] Design peer comparison matrix contract
   - [ ] Implement pairwise comparison storage (A > B tallies)
   - [ ] Deploy to worldchain-sepolia testnet
   - [ ] Test contract interaction from frontend

4. **Real-time Tally Updates**
   - [ ] Calculate pairwise comparisons from ranking changes
   - [ ] Update smart contract immediately on reordering
   - [ ] Remove old comparisons when rankings change
   - [ ] Display live tally feedback (optional)

### 🔥 Priority 3: Integration & Testing

5. **Frontend-Contract Integration**
   - [ ] Connect ranking interface to peer tally contract
   - [ ] Handle transaction states (pending, confirmed, failed)
   - [ ] Optimize for frequent small updates
   - [ ] Error handling and retry logic

6. **User Experience Polish**
   - [ ] Smooth animations for ranking changes
   - [ ] Visual feedback for tie creation
   - [ ] Loading states for blockchain updates
   - [ ] Clear ranking number display

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
