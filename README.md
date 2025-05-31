# Election Voting System - World Mini App

A comprehensive ranked-choice voting system built as a World Mini App with World ID verification and smart contract integration.

## 🎯 Overview

This project implements a complete election voting system where users can:

- **Create Elections**: Set up new elections with custom candidates and World ID actions
- **Vote with Rankings**: Submit ranked preference votes with World ID verification
- **Trigger Selection**: Calculate winners using Tideman/Condorcet methods
- **View Results**: Display election results and analytics

## 🏗️ Architecture

### Smart Contracts (Solidity)

- **ElectionManager.sol**: Factory contract for creating and managing multiple elections
- **Election.sol**: Individual election contracts with World ID verification and ranking storage
- Deployed on World Chain Sepolia testnet at: `0xAA75C772ca977F89125B3592355346b9eFD37AC9`

### Frontend (Next.js + TypeScript)

- **World Mini App**: Optimized for World App integration
- **MiniKit Integration**: Seamless connection with World App
- **Interactive Ranking**: Drag-and-drop candidate ranking interface
- **Real-time Updates**: Live election status and results

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- World App (for testing)

### Installation

```bash
# Install all dependencies
pnpm install

# Start development server
pnpm dev

# Build and deploy contracts
pnpm deploy:contracts

# Sync contract addresses to frontend
pnpm sync-contracts
```

### Development Workflow

```bash
# Full deployment pipeline
pnpm deploy:full

# Run tests
pnpm test

# Build everything
pnpm build

# Clean build artifacts
pnpm clean
```

## 📁 Project Structure

This is a monorepo workspace with the following structure:

```text
eg25/
├── README.md                    # This file
├── package.json                 # Root workspace configuration
├── vote/                        # Main voting system
│   ├── world-app/              # Next.js World Mini App
│   │   ├── src/                # Application source code
│   │   ├── public/             # Static assets
│   │   └── package.json        # Frontend dependencies
│   ├── contracts/              # Smart contract project
│   │   ├── contracts/          # Solidity contracts
│   │   ├── scripts/            # Deployment scripts
│   │   └── package.json        # Contract dependencies
│   └── docs/                   # Documentation
├── submissions/                 # Project submission files
└── contracts/                   # Additional contract files
```

## 🔧 Key Features

### Smart Contract Features

- **World ID Integration**: Ensures one vote per verified human
- **Ranked Choice Voting**: Support for preference-based voting
- **Multi-Election Support**: Factory pattern for creating multiple elections
- **Access Control**: Role-based permissions for election management
- **Pausable Operations**: Emergency controls for election safety

### Frontend Features

- **Mobile-First Design**: Optimized for World App mobile experience
- **Drag-and-Drop Ranking**: Intuitive candidate ranking interface
- **Real-Time Updates**: Live candidate loading and voting status
- **MiniKit Integration**: Seamless World App wallet connection
- **TypeScript**: Full type safety throughout the application

## 🌐 Deployment

The system is deployed on World Chain Sepolia testnet:

- **Network**: World Chain Sepolia (Chain ID: 4801)
- **ElectionManager Contract**: `0xAA75C772ca977F89125B3592355346b9eFD37AC9`
- **World ID App ID**: `app_10719845a0977ef63ebe8eb9edb890ad`

## 📚 Documentation

For detailed information, see the documentation in the `vote/docs/` directory:

- **SETUP.md**: Development environment setup
- **SMART_CONTRACT.md**: Contract deployment and interaction
- **MINI_APP.md**: World Mini App integration guide
- **TROUBLESHOOTING.md**: Common issues and solutions

## 🧪 Testing

Run the test suite to verify functionality:

```bash
# Run all tests
pnpm test

# Test contracts only
pnpm --filter contracts test

# Test frontend only
pnpm --filter world-app test
```

## 🤝 Contributing

This project demonstrates advanced voting system research and electoral reform concepts. The Tideman/Condorcet method implementation represents cutting-edge research in electoral systems.
