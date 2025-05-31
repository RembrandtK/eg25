# Election Voting System - World Mini App

## 🚀 Project Overview

A comprehensive ranked-choice voting system built as a World Mini App that enables secure, verifiable elections using World ID for human verification. The system allows users to create elections, submit ranked preference votes, calculate winners using the Tideman/Condorcet method, and view election results.

## ✨ Key Features

- **Create Elections**: Set up new elections with custom candidates and World ID actions
- **Vote with Rankings**: Submit ranked preference votes with World ID verification
- **Trigger Selection**: Calculate winners using Tideman/Condorcet methods
- **View Results**: Display election results and analytics
- **Multi-Election Support**: Switch between different elections
- **Mobile Optimized**: Designed for World App mobile experience

## 🏗️ Technical Architecture

### Smart Contracts (Solidity)
- **ElectionManager.sol**: Factory contract for creating and managing multiple elections
- **Election.sol**: Individual election contracts with World ID verification and ranking storage
- Deployed on World Chain Sepolia testnet at: `0xAA75C772ca977F89125B3592355346b9eFD37AC9`

### Frontend (Next.js + TypeScript)
- **World Mini App**: Optimized for World App integration
- **MiniKit Integration**: Seamless connection with World App
- **Interactive Ranking**: Intuitive candidate ranking interface
- **Real-time Updates**: Live election status and results

## 🔧 How It Works

1. **Election Creation**: Admin creates an election through ElectionManager
2. **User Authentication**: Users connect their wallet and verify with World ID
3. **Candidate Ranking**: Users rank candidates in order of preference
4. **Vote Submission**: Rankings are submitted on-chain with World ID proof
5. **Result Calculation**: Tideman algorithm determines the winner based on ranked preferences
6. **Result Display**: Election results are displayed with detailed analytics

## 📱 Demo Instructions

### Local Testing

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Access the app
open http://localhost:3000
```

### Mobile Testing with World App

1. Run the app locally: `pnpm dev`
2. Start ngrok tunnel: `pnpm ngrok`
3. Update your World ID app configuration in the Developer Portal
4. Scan the QR code with World App

### Smart Contract Interaction

```bash
# Deploy contracts (if needed)
pnpm deploy:contracts

# Sync contract addresses to frontend
pnpm sync-contracts
```

## 🌐 Deployed Version

- **Contract**: `0xAA75C772ca977F89125B3592355346b9eFD37AC9` on worldchain-sepolia
- **World ID App**: `app_10719845a0977ef63ebe8eb9edb890ad`
- **Test URL**: https://pet-jackal-crucial.ngrok-free.app

## 🔮 Future Enhancements

- Advanced analytics for voting patterns
- Enhanced UX with drag-and-drop tie creation
- Real-time vote count updates
- Social sharing of election results
- Notification system for election events

## 👥 Team

[Your team information here]

## 🙏 Acknowledgements

- World ID team for providing the verification infrastructure
- World Chain for the blockchain platform
- [Any other acknowledgements]