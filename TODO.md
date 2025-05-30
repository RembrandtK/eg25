# Election Mini App - Development TODO

## 🎯 Project Overview

Election voting system where users can:

1. View candidates from a smart contract
2. Rank candidates in order of preference
3. Submit ranked votes using World ID verification

## 🏗️ Architecture & Design

### Smart Contract

- **ElectionManager.sol** deployed to worldchain-sepolia: `0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7`
- Manages candidates and ranked voting with World ID verification
- 4 test candidates: Alice Johnson, Bob Smith, Carol Davis, David Wilson

### Frontend Components

- **Bottom Navigation**: Two-tab interface (Candidates / My Ranking)
- **CandidatesTab**: Displays candidate list from contract
- **RankingTab**: Drag-and-drop interface for ranking candidates
- **World ID Integration**: Verification before voting access
- **Debug Monitoring**: Server-side logging with `/api/debug` endpoint (UI hidden)

## 📋 Current Tasks

1. **Test Complete Voting Flow**
   - [x] Test candidate loading from contract ✅
   - [ ] Test ranking interface (drag-and-drop)
   - [ ] Test vote submission to blockchain
   - [ ] Test post-vote state (prevent double counting)

## 🔧 Technical Details

- **Contract**: `0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7` on worldchain-sepolia
- **World ID App**: `app_10719845a0977ef63ebe8eb9edb890ad`
- **Development**: `pnpm dev` at localhost:3000
