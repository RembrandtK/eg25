# Election Voting Mini App

A World Mini App for conducting ranked-choice elections with World ID verification. Built with Next.js and deployed on World Chain.

## Features

- **Ranked Choice Voting**: Users can rank candidates in order of preference
- **World ID Verification**: Ensures one vote per verified human
- **Smart Contract Integration**: Votes are recorded on-chain for transparency
- **Real-time Updates**: Live candidate loading and voting status
- **Mobile Optimized**: Designed for World App mobile experience

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## World ID Verification Setup

This application uses World ID verification to ensure election integrity:

1. Create an account on the [Worldcoin Developer Portal](https://developer.worldcoin.org/)
2. Create a new App in the Developer Portal
3. Create a new "Incognito Action" within your app for voting verification
   - Incognito Actions ensure one vote per verified human
   - Set the action to allow only one verification per user
4. Copy your app ID and update the `.env.local` file:

   ```env
   NEXT_PUBLIC_WLD_APP_ID="app_YOUR_MINI_APP_ID_HERE"
   NEXT_PUBLIC_WLD_ACTION_ID="election-vote-action" # Or your custom action ID
   ```

5. Make sure you have the World App installed on your device to test the voting flow

### Voting Flow

The election voting process works as follows:

1. User connects their World App wallet (automatic in World App)
2. User verifies their World ID to participate in the election
3. User views candidates loaded from the smart contract
4. User ranks candidates using drag-and-drop interface
5. User submits their ranked vote to the blockchain

## Smart Contract

The election is powered by the `ElectionManager` smart contract deployed on World Chain Sepolia:

- **Contract Address**: `0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7`
- **Network**: World Chain Sepolia (Chain ID: 4801)
- **Features**: Candidate management, ranked voting, World ID verification

### Contract Functions

- `getCandidates()`: Returns all active candidates
- `vote(uint256[] candidateIds)`: Submit a ranked vote
- `checkHasVoted(address voter)`: Check if an address has already voted
- `addCandidate(string name, string description)`: Add a new candidate (admin only)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

To learn more about World ID and Mini Apps:

- [World ID Documentation](https://docs.world.org/)
- [Mini Apps Quick Start](https://docs.world.org/mini-apps/quick-start)
- [Verify Command Documentation](https://docs.world.org/mini-apps/commands/verify)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
