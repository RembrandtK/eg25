# Setup Guide

This guide will walk you through setting up the World Mini App with smart contract integration from scratch.

## Quick Start (For World App Testing)

If you just want to run the app in World App quickly:

1. **Start the dev server:**
   ```bash
   cd vote/world-app
   pnpm dev
   ```

2. **Start ngrok in another terminal:**
   ```bash
   cd vote/world-app
   pnpm ngrok
   ```

3. **Copy the ngrok HTTPS URL** and configure it in your [World ID app settings](https://developer.worldcoin.org)

4. **Scan the QR code** in World App to test

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **pnpm** package manager (`npm install -g pnpm`)
- **World App** installed on your phone
- **World ID account** (sign up in World App)
- **Git** for version control

## Step 1: Environment Setup

### Install Required Tools

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Verify installations
node --version  # Should be 18+
pnpm --version
```

### Get a World ID App

1. Go to [World Developer Portal](https://developer.worldcoin.org)
2. Sign in with your World ID
3. Create a new app
4. Note down your **App ID** (starts with `app_`)
5. Configure an action called "vote" in the Incognito Actions tab

## Step 2: Project Setup

### Clone and Install Dependencies

```bash
# Navigate to your project directory
cd app

# Install Mini App dependencies
cd my-app
pnpm install

# Install smart contract dependencies
cd ../smart-contract
pnpm install
```

### Verify Installation

```bash
# Test Mini App compilation
cd my-app
pnpm build

# Test smart contract compilation
cd ../smart-contract
npx hardhat compile
```

## Step 3: Configuration

### Mini App Environment Variables

Create `my-app/.env.local`:

```bash
# World ID Configuration
NEXT_PUBLIC_WLD_APP_ID="app_your_app_id_here"
NEXT_PUBLIC_WLD_ACTION_ID="vote"

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NEXTAUTH_URL="http://localhost:3001"

# NextAuth Secret (generate a random string)
NEXTAUTH_SECRET="your-random-secret-key-here"

# Contract Address (will be filled after deployment)
NEXT_PUBLIC_TUTE_CONTRACT_ADDRESS=""
```

### Smart Contract Environment Variables

Create `smart-contract/.env`:

```bash
# Deployment Private Key (without 0x prefix)
PRIVATE_KEY="your_private_key_here"

# RPC URLs
WORLD_CHAIN_SEPOLIA_RPC="https://worldchain-sepolia.g.alchemy.com/public"

# World ID Address Book (zero address for testnet)
WORLD_ID_ADDRESS_BOOK="0x0000000000000000000000000000000000000000"
```

## Step 4: Get Testnet ETH

You'll need testnet ETH to deploy your smart contract:

1. Visit [World Chain Sepolia Faucet](https://faucet.worldchain.org)
2. Connect your wallet
3. Request testnet ETH
4. Wait for the transaction to confirm

## Step 5: Deploy Smart Contract

```bash
cd smart-contract

# Deploy to World Chain Sepolia testnet
pnpm run deploy:worldchain
```

The deployment will output:
- Contract address
- Transaction hash
- Verification command

**Important**: Copy the contract address and add it to your Mini App's `.env.local`:

```bash
NEXT_PUBLIC_TUTE_CONTRACT_ADDRESS="0xYourContractAddressHere"
```

## Step 6: Verify Contract (Optional)

```bash
# Verify on Blockscout
npx hardhat verify --network worldchain <CONTRACT_ADDRESS> "0x0000000000000000000000000000000000000000"
```

## Step 7: Run the Application

```bash
cd my-app
pnpm dev
```

Your Mini App will be available at `http://localhost:3001`

## Step 8: Test Locally

1. Open `http://localhost:3001` in your browser
2. Test the wallet connection flow
3. Test the World ID verification
4. Test token claiming functionality

## Step 9: Mobile Testing Setup

### Using NGROK (Proper Way)

1. **Start the development server first:**
   ```bash
   cd vote/world-app
   pnpm dev
   ```
   This runs on `http://localhost:3000`

2. **Start ngrok using the package script:**
   ```bash
   # In a new terminal
   cd vote/world-app
   pnpm ngrok
   ```
   This will start ngrok and show you the public HTTPS URL

3. **Copy the HTTPS URL** from the ngrok output (e.g., `https://pet-jackal-crucial.ngrok-free.app`)

### Configure World ID App

1. Go to [World Developer Portal](https://developer.worldcoin.org)
2. Navigate to your app's configuration
3. Update the **App URL** to your ngrok HTTPS URL
4. Save the changes

### Test on Mobile

1. In the Developer Portal, go to `Configuration > Basic`
2. Scan the QR code with World App
3. Test the full flow on your phone

## Troubleshooting

### Common Issues

**"Insufficient funds" error**
- Ensure your wallet has testnet ETH
- Check you're using the correct network (World Chain Sepolia)

**"Contract not found" error**
- Verify the contract address in your `.env.local`
- Ensure the contract was deployed successfully

**World ID verification fails**
- Check your App ID is correct
- Ensure the action "vote" exists in your app configuration
- Verify you're using the correct World ID app

**NGROK connection issues**
- Ensure NGROK is running and accessible
- Check the HTTPS URL is correctly configured in World ID app
- Try restarting NGROK with a new URL

### Getting Help

- Check the [World Documentation](https://docs.world.org/)
- Visit the [World Discord](https://world.org/discord)
- Review the [troubleshooting guide](./TROUBLESHOOTING.md)

## Next Steps

Once your setup is working:

1. Customize the UI and branding
2. Add additional smart contract functionality
3. Deploy to World Chain mainnet for production
4. Submit your Mini App for review

## Security Notes

- Never commit private keys to version control
- Use environment variables for all sensitive data
- Generate strong random secrets for production
- Test thoroughly before mainnet deployment
