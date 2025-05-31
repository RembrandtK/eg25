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
- Deployed on World Chain Sepolia testnet

### Frontend (Next.js + TypeScript)
- **World Mini App**: Optimized for World App integration
- **Multi-Election Support**: Switch between different elections
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
```
