# Blockscout Integration Scripts

This directory contains scripts for generating contract documentation and integrating with Blockscout explorers.

## What's Included

- **Contract Documentation Generator**: Creates CONTRACTS.md from Ignition deployments
- **Blockscout API Utilities**: Basic functions for interacting with Blockscout APIs
- **Contract Verification Scripts**: Tools for submitting contracts to Blockscout for verification
- **Analytics Tools**: Basic contract usage analysis

## Scripts

### Generate CONTRACTS.md

```bash
pnpm run generate:contracts-md
```

Reads Ignition deployment data and creates a markdown table with contract addresses and Blockscout links.

### Contract Verification

```bash
pnpm run verify:blockscout:sepolia
```

Submits contracts for verification on Blockscout (experimental).

### Contract Analytics

```bash
pnpm run analytics --contract=0x... --network=worldchain-sepolia
```

Basic contract usage analysis using Blockscout APIs.

## Network Configuration

The scripts are configured for:

- **World Chain Sepolia** (4801): `https://worldchain-sepolia.explorer.alchemy.com`
- **World Chain Mainnet** (480): `https://worldchain-mainnet.explorer.alchemy.com`

These are Alchemy-hosted Blockscout instances.

## Usage

After deploying contracts with Ignition, run:

```bash
pnpm run generate:contracts-md
```

This will create/update the CONTRACTS.md file with current deployment information and Blockscout links.
