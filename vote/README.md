# World Mini App with Smart Contract Integration

A complete World Mini App template that integrates with on-chain smart contracts on World Chain. This app demonstrates wallet authentication, World ID verification, and ERC20 token claiming functionality.

## 🏗️ Project Structure

This project contains a complete Election Voting System with World ID verification:

```text
vote/
├── world-app/              # Next.js World Mini App (Election Voting Interface)
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── lib/          # Utilities and configurations
│   │   └── providers/    # Context providers
│   ├── .env.local        # Environment variables
│   └── package.json      # Dependencies
├── contracts/             # Hardhat smart contract project (Election System)
│   ├── contracts/        # Solidity contracts (Election.sol, ElectionManager.sol)
│   ├── scripts/          # Deployment and ABI extraction scripts
│   ├── .env             # Contract deployment config
│   └── hardhat.config.js # Hardhat configuration
└── README.md             # This file
```

## 📱 Features

- **Wallet Authentication**: Connect using World App wallet with SIWE
- **World ID Verification**: Verify human identity with World ID
- **Transaction Tracking**: Real-time blockchain transaction status
- **Responsive Design**: Optimized for mobile World App

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- World App installed on your phone
- World ID account (for testing)
- Some testnet ETH for contract deployment

### 1. Install Dependencies

```bash
# Install Mini App dependencies
cd my-app
pnpm install

# Install smart contract dependencies
cd ../smart-contract
pnpm install
```

### 2. Configure Environment Variables

#### Mini App Configuration (`my-app/.env.local`)
```bash
NEXT_PUBLIC_WLD_APP_ID="your_world_id_app_id"
NEXT_PUBLIC_WLD_ACTION_ID="vote"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_TUTE_CONTRACT_ADDRESS="deployed_contract_address"
```

#### Smart Contract Configuration (`smart-contract/.env`)
```bash
PRIVATE_KEY="your_private_key_without_0x"
WORLD_CHAIN_SEPOLIA_RPC="https://worldchain-sepolia.g.alchemy.com/public"
WORLD_ID_ADDRESS_BOOK="0x0000000000000000000000000000000000000000"
```

### 3. Deploy Smart Contract

```bash
cd smart-contract
pnpm run deploy:worldchain
```

Copy the deployed contract address to your Mini App's `.env.local` file.

### 4. Run the Mini App

```bash
cd my-app
pnpm dev
```

The app will be available at `http://localhost:3001`

## 🔧 Development

### Running Tests

```bash
# Smart contract tests
cd smart-contract
pnpm test

# Mini App tests (if available)
cd my-app
pnpm test
```

### Building for Production

```bash
cd my-app
pnpm build
```

### Contract Verification

After deploying your contract, verify it on Blockscout:

```bash
cd smart-contract
npx hardhat verify --network worldchain <CONTRACT_ADDRESS> "0x0000000000000000000000000000000000000000"
```

## 📱 Testing on Mobile

To test your Mini App on your phone, expose your app publicly using NGROK:

### Using NGROK

1. Install [NGROK](https://ngrok.com/)
2. Run your Mini App locally: `pnpm dev`
3. In another terminal, run: `ngrok http http://localhost:3001`
4. Copy the NGROK URL and update your World ID app configuration in the [Developer Portal](https://developer.worldcoin.org/)

### Opening in World App

1. Go to the [Developer Portal](https://developer.worldcoin.org/)
2. Navigate to `Configuration > Basic`
3. Scan the generated QR code with World App

## 🌐 Network Information

### World Chain Sepolia Testnet
- **Chain ID**: 4801
- **RPC URL**: https://worldchain-sepolia.g.alchemy.com/public
- **Block Explorer**: https://worldchain-sepolia.blockscout.com
- **Faucet**: [Get testnet ETH](https://faucet.worldchain.org)

### World Chain Mainnet
- **Chain ID**: 480
- **RPC URL**: https://worldchain-mainnet.g.alchemy.com/public
- **Block Explorer**: https://worldscan.org

## 🔗 Useful Links

- [World Documentation](https://docs.world.org/)
- [World Developer Portal](https://developer.worldcoin.org)
- [MiniKit Documentation](https://docs.world.org/mini-apps)
- [World Chain Documentation](https://docs.world.org/world-chain)

## 📄 License

MIT License - see LICENSE file for details
