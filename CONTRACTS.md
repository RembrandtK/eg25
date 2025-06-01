# Deployed Contracts

> Auto-generated from Ignition deployment data

This document contains information about all smart contracts deployed across different networks using Hardhat Ignition.

## Quick Start

To update this documentation:

```bash
cd vote/contracts
pnpm run generate:contracts-md
```

To verify contracts on Blockscout:

```bash
cd vote/contracts
pnpm run verify:blockscout:sepolia
```

## Overview

### World Chain Sepolia (Chain ID: 4801)

| Contract | Address | Verified | Compiler | Block Explorer |
|----------|---------|----------|----------|----------------|
| ElectionManager | `0xE633498333Cc9079340EAE0864D001336211d111` | ❌ | v0.8.27+commit.40a35a09 | [View](https://worldchain-sepolia.explorer.alchemy.com/address/0xE633498333Cc9079340EAE0864D001336211d111) |

### World Chain Mainnet (Chain ID: 480)

> No contracts deployed on World Chain Mainnet

## Contract Details

### ElectionManager

- **Address**: `0xE633498333Cc9079340EAE0864D001336211d111`
- **Network**: World Chain Sepolia
- **Verified**: No
- **Compiler**: v0.8.27+commit.40a35a09
- **EVM Version**: london
- **Optimization**: Enabled
- **Deployed at Block**: 12345678
- **Block Explorer**: [View on World Chain Sepolia](https://worldchain-sepolia.explorer.alchemy.com/address/0xE633498333Cc9079340EAE0864D001336211d111)
- **Deployment Module**: ElectionDeployment

## Available Scripts

### Documentation & Verification

- `pnpm run generate:contracts-md` - Generate this documentation
- `pnpm run verify:blockscout:sepolia` - Verify contracts on Sepolia
- `pnpm run verify:blockscout` - Verify contracts (specify network)

### Analytics & Monitoring

- `pnpm run analytics --contract=0x... --network=worldchain-sepolia` - Analyze contract usage

### Complete Workflows

- `pnpm run deploy:complete` - Deploy + sync + document
- `pnpm run deploy:complete:verify` - Deploy + sync + document + verify

## Features

This system provides:

- 📄 Auto-generated contract documentation from Ignition deployments
- 🔗 Direct links to Blockscout explorers for contract inspection
- 📋 Contract verification scripts for Blockscout
- 📊 Basic contract analytics tools

## Notes

- ✅ = Contract is verified on block explorer
- ❌ = Contract is not verified
- This file is auto-generated from Ignition deployment data
- To update this file, run: `pnpm run generate:contracts-md`

## Useful Links

- [World Chain Sepolia Explorer](https://worldchain-sepolia.explorer.alchemy.com)
- [World Chain Mainnet Explorer](https://worldchain-mainnet.explorer.alchemy.com)
- [Hardhat Ignition Documentation](https://hardhat.org/ignition)
- [Blockscout API Documentation](https://docs.blockscout.com/devs/apis)