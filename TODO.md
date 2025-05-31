# Voting App Migration & Enhancement — Election + ElectionManager Integration

MUST:

1. Keep updating this file with latest plans and tasks to work from.
2. Regularly commit and push changes being made.
3. Keep design doc of approach that evolves and is referenced.
4. Keep going on resolving issues.

## 🎯 Project Overview

**MIGRATION COMPLETE**: PeerRanking contract removed, all functionality consolidated into Election + ElectionManager contracts.

**NEW REQUIREMENTS**: Full election lifecycle management where users can:

1. **Create Elections**: Set up new elections with candidates and World ID actions
2. **Vote with Rankings**: Submit ranked votes with World ID verification
3. **Trigger Selection**: Server-based selection calculation and reporting
4. **View Results**: Display election results and analytics

## 🏗️ Architecture & Design

### Current Smart Contracts (UPDATED)

- **ElectionManager.sol** deployed to worldchain-sepolia: `0xAA75C772ca977F89125B3592355346b9eFD37AC9`
- **Election.sol** instances created by ElectionManager for each election
- 4 test candidates: Alice Johnson, Bob Smith, Carol Davis, David Wilson

### Contract Capabilities (CONFIRMED)

- **Election Creation**: ElectionManager creates separate Election contracts
- **World ID Verification**: Proper ZK proof verification per vote
- **Ranking Storage**: RankingEntry[] with tie support
- **Selection Reporting**: Reporter role can trigger and store results

## 🚨 **CRITICAL REQUIREMENT: REGULAR COMMITS**

**MUST commit and push changes regularly throughout development!**

- After completing each task or significant change
- Before switching between major components
- At least every 30 minutes of active development

## 🚨 CRITICAL MIGRATION TASKS (HIGH PRIORITY)

### Phase 1: Contract Interface Migration

#### 1.1 Remove PeerRanking Dependencies (URGENT)
- [ ] Update mini app to use Election contracts instead of PeerRanking
- [ ] Remove all PeerRanking ABI imports and references
- [ ] Update contract address configuration to use ElectionManager
- [ ] Fix VoteButton component to use Election.vote() method
- [ ] Update usePeerRanking hook to use Election contract methods

#### 1.2 Add Election Contract Integration
- [ ] Create Election ABI imports and interfaces
- [ ] Add Election contract reading functionality
- [ ] Implement proper World ID verification flow for Election.vote()
- [ ] Update ranking data structures to match RankingEntry[]
- [ ] Test contract interactions with deployed Election instances

### Phase 2: Multi-Election Support

#### 2.1 Election Management Interface
- [ ] Add election list/selection UI component
- [ ] Implement election creation form with candidates
- [ ] Add election status and metadata display
- [ ] Create election switching functionality

#### 2.2 Election Creation Workflow
- [ ] Design election creation form with World ID action input
- [ ] Add candidate management (add/remove/edit)
- [ ] Implement ElectionManager.createElection() integration
- [ ] Add proper error handling and validation

### Phase 3: Selection & Results System

#### 3.1 Selection Triggering
- [ ] Add admin interface for triggering selection calculation
- [ ] Implement server-side Tideman/Condorcet calculation
- [ ] Add Election.reportSelection() integration
- [ ] Create selection status monitoring

#### 3.2 Results Display
- [ ] Design election results UI component
- [ ] Add winner announcement and ranking display
- [ ] Implement results analytics and visualization
- [ ] Add historical results viewing

## 🧪 COMPREHENSIVE TESTING REQUIREMENTS

### Phase 4: Test Coverage

#### 4.1 Contract Integration Tests (CRITICAL)
- [ ] Test ElectionManager.createElection() workflow
- [ ] Test Election.vote() with World ID verification
- [ ] Test Election.reportSelection() functionality
- [ ] Test multi-election scenarios and switching
- [ ] Add gas estimation and optimization tests

#### 4.2 Frontend Integration Tests
- [ ] Test election creation end-to-end workflow
- [ ] Test voting workflow with ranking persistence
- [ ] Test election switching and state management
- [ ] Test error handling and edge cases
- [ ] Add mobile/World App specific testing

### 🚀 FUTURE ENHANCEMENTS (LOWER PRIORITY)

1. **Advanced Analytics**
   - [ ] Real-time voting pattern visualization
   - [ ] Cross-election comparison tools
   - [ ] Historical voting data analysis
   - [ ] Voter participation metrics

2. **Enhanced UX Features**
   - [ ] Drag-and-drop tie creation in rankings
   - [ ] Real-time vote count updates
   - [ ] Social sharing of election results
   - [ ] Notification system for election events

## 🔧 Technical Details

- **Current Contract**: `0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7` on worldchain-sepolia
- **World ID App**: `app_10719845a0977ef63ebe8eb9edb890ad`
- **Development**: `pnpm dev` at localhost:3000, also need to run ngrok for World App testing using script
