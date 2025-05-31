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
3. Move away from tallying real-time, will need to add server-based selection step.

## 🏗️ Architecture & Design

### Current Smart Contract

- **ElectionManager.sol** deployed to worldchain-sepolia: `0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7`
- 4 test candidates: Alice Johnson, Bob Smith, Carol Davis, David Wilson

### Peer Ranking Smart Contract

- **Unranked Candidates Pool**: Bottom section showing available candidates
- **Ranked Candidates List**: Top section showing current ranking with proper numbering
- **Interactive Ranking**: Add candidates from pool to ranked list
- **Tie Support**: Equal ranks (2=, 2=, 4) with proper numbering

## 🚨 **CRITICAL REQUIREMENT: REGULAR COMMITS**

**MUST commit and push changes regularly throughout development!**

- After completing each task or significant change
- Before switching between major components
- At least every 30 minutes of active development

## ✅ COMPLETED ENHANCEMENTS & TESTING

### ✅ Smart Contract Enhancements

## 🚨 REMAINING FRONTEND INTEGRATION TASKS

### Priority 1: Frontend Integration (HIGH PRIORITY)

#### 1.1 Rankings Not Persisting on Reentry (HIGH PRIORITY)

- **Issue**: Transactions succeed but rankings don't load back when user returns
- **Root Cause**: Contract reading issues or blockchain confirmation delays
- **Tasks**:
  - [ ] Debug contract reading with proper logging
  - [ ] Add blockchain confirmation waiting (increase from 2s to 10s)
  - [ ] Implement proper error handling for failed reads
  - [ ] Add manual "Refresh" button for debugging
  - [ ] Test with different RPC endpoints to isolate issue

### Priority 3: User Experience Improvements (LOW PRIORITY)

### 🚀 FUTURE ENHANCEMENTS

1. **Multiple Elections System**

   - [ ] Design election factory contract pattern
   - [ ] Need to use World API to create unique action per election
   - [ ] Each election = separate smart contract instance
   - [ ] Elections tab with list of available elections
   - [ ] Election creation and management interface
   - [ ] Cross-election analytics and comparison

2. **Advanced Ranking Features**
  
   - [ ] Tie support with proper numbering (1, 2=, 2=, 4)
   - [ ] Drag-and-drop tie creation
   - [ ] Condorcet method result calculation
   - [ ] Ranked pairs algorithm implementation

3. **Analytics & Visualization**
   - [ ] Real-time comparison tallies display
   - [ ] Voting pattern visualization
   - [ ] Election results dashboard
   - [ ] Historical voting data analysis

## 🔧 Technical Details

- **Current Contract**: `0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7` on worldchain-sepolia
- **World ID App**: `app_10719845a0977ef63ebe8eb9edb890ad`
- **Development**: `pnpm dev` at localhost:3000, also need to run ngrok for World App testing using script
