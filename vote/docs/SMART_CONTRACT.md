# Smart Contract Guide

This guide covers the TUTE smart contract deployment, verification, and interaction on World Chain.

## Contract Overview

The TUTE contract is an ERC20 token with the following features:

- **Token Name**: TUTE
- **Token Symbol**: TUTE
- **Decimals**: 18 (standard ERC20)
- **Claim Amount**: 1 TUTE per claim
- **Claim Frequency**: 300 seconds (5 minutes)
- **World ID Integration**: Optional verification requirement

## Contract Architecture

```solidity
contract TUTE is ERC20 {
    IWorldIdAddressBook public immutable worldAddressBook;
    uint256 public constant CLAIM_FREQUENCY_SECONDS = 60 * 5;
    uint256 public constant CLAIM_AMOUNT = 1 ether;
    mapping(address => uint256) public lastMint;
    
    function claim() external;
}
```

## Deployment

### Prerequisites

1. **Private Key**: Export from your wallet (without 0x prefix)
2. **Testnet ETH**: Get from [World Chain Sepolia Faucet](https://faucet.worldchain.org)
3. **Environment Setup**: Configure `.env` file

### Environment Configuration

Create `smart-contract/.env`:

```bash
# Deployment Configuration
PRIVATE_KEY="your_private_key_without_0x"
WORLD_CHAIN_SEPOLIA_RPC="https://worldchain-sepolia.g.alchemy.com/public"

# World ID Configuration
WORLD_ID_ADDRESS_BOOK="0x0000000000000000000000000000000000000000"  # Testnet
# WORLD_ID_ADDRESS_BOOK="0x57b930D551e677CC36e2fA036Ae2fe8FdaE0330D"  # Mainnet

# Optional: Contract Verification
WORLDCHAIN_API_KEY=""  # Not required for Blockscout
```

### Deploy to Testnet

```bash
cd smart-contract

# Compile contracts
npx hardhat compile

# Deploy to World Chain Sepolia
pnpm run deploy:worldchain
```

### Deploy to Mainnet

1. Update `.env` with mainnet World ID Address Book:
   ```bash
   WORLD_ID_ADDRESS_BOOK="0x57b930D551e677CC36e2fA036Ae2fe8FdaE0330D"
   ```

2. Update `hardhat.config.js` for mainnet:
   ```javascript
   worldchain: {
     url: "https://worldchain-mainnet.g.alchemy.com/public",
     chainId: 480,  // Mainnet chain ID
     accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
   }
   ```

3. Deploy:
   ```bash
   pnpm run deploy:worldchain
   ```

## Contract Verification

### Using Blockscout

Blockscout is the preferred block explorer for World Chain:

```bash
# Verify on testnet
npx hardhat verify --network worldchain <CONTRACT_ADDRESS> "0x0000000000000000000000000000000000000000"

# Verify on mainnet
npx hardhat verify --network worldchain <CONTRACT_ADDRESS> "0x57b930D551e677CC36e2fA036Ae2fe8FdaE0330D"
```

### Manual Verification

If automatic verification fails:

1. Go to [World Chain Sepolia Blockscout](https://worldchain-sepolia.blockscout.com)
2. Navigate to your contract address
3. Click "Verify & Publish"
4. Select "Solidity (Single file)"
5. Upload your flattened contract source

### Flatten Contract

```bash
npx hardhat flatten contracts/TUTE.sol > TUTE_flattened.sol
```

## Contract Interaction

### Reading Contract Data

```javascript
// Get contract instance
const contract = new ethers.Contract(contractAddress, abi, provider);

// Read public variables
const name = await contract.name();
const symbol = await contract.symbol();
const claimAmount = await contract.CLAIM_AMOUNT();
const claimFrequency = await contract.CLAIM_FREQUENCY_SECONDS();

// Check user's last claim time
const lastMint = await contract.lastMint(userAddress);

// Check user's balance
const balance = await contract.balanceOf(userAddress);
```

### Writing to Contract

```javascript
// Connect with signer
const contract = new ethers.Contract(contractAddress, abi, signer);

// Claim tokens
const tx = await contract.claim();
await tx.wait();
```

### Error Handling

Common errors and solutions:

```javascript
try {
  const tx = await contract.claim();
  await tx.wait();
} catch (error) {
  if (error.message.includes("Address not verified")) {
    // User needs World ID verification
  } else if (error.message.includes("Your claim is not available yet")) {
    // User must wait for cooldown period
  } else if (error.message.includes("insufficient funds")) {
    // User needs more ETH for gas
  }
}
```

## Testing

### Local Testing

```bash
# Run contract tests
cd smart-contract
pnpm test

# Test with local Hardhat network
npx hardhat node
# In another terminal:
npx hardhat run scripts/deploy.js --network localhost
```

### Integration Testing

Test the contract with your Mini App:

1. Deploy to testnet
2. Update Mini App configuration
3. Test full user flow
4. Verify transactions on Blockscout

## Gas Optimization

### Deployment Costs

- **TUTE Contract**: ~800,000 gas
- **Estimated Cost**: 0.0008 ETH (at 1 gwei)

### Transaction Costs

- **claim()**: ~50,000 gas
- **transfer()**: ~21,000 gas
- **approve()**: ~46,000 gas

### Optimization Tips

1. **Batch Operations**: Combine multiple calls when possible
2. **Gas Price**: Use appropriate gas price for network conditions
3. **Contract Size**: Keep contract code minimal

## Security Considerations

### Access Control

The contract uses:
- World ID verification for claim eligibility
- Time-based cooldowns to prevent spam
- Standard ERC20 security patterns

### Audit Checklist

- [ ] Reentrancy protection (not needed for current functions)
- [ ] Integer overflow protection (Solidity 0.8+ built-in)
- [ ] Access control verification
- [ ] Time manipulation resistance
- [ ] Gas limit considerations

### Best Practices

1. **Test Thoroughly**: Test all functions and edge cases
2. **Verify Contracts**: Always verify on block explorer
3. **Monitor Usage**: Watch for unusual activity
4. **Upgrade Path**: Consider proxy patterns for upgradability

## Monitoring and Analytics

### On-Chain Metrics

Track these metrics:
- Total supply
- Number of unique claimers
- Claim frequency
- Gas usage patterns

### Blockscout Analytics

Use Blockscout to monitor:
- Transaction volume
- Active addresses
- Token transfers
- Contract interactions

### Custom Analytics

Implement event logging:

```solidity
event TokensClaimed(address indexed user, uint256 amount, uint256 timestamp);

function claim() external {
    // ... claim logic ...
    emit TokensClaimed(msg.sender, CLAIM_AMOUNT, block.timestamp);
}
```

## Troubleshooting

### Common Deployment Issues

**"Insufficient funds for gas"**
- Get more testnet ETH from faucet
- Check gas price settings

**"Contract creation failed"**
- Verify constructor parameters
- Check contract size limits

**"Verification failed"**
- Ensure exact compiler version match
- Check constructor parameters
- Try manual verification

### Runtime Issues

**"Address not verified"**
- User needs World ID verification
- Check World ID Address Book configuration

**"Claim not available yet"**
- User must wait for cooldown period
- Check `lastMint` timestamp

## Advanced Features

### Upgradeability

For production contracts, consider:

```solidity
// Using OpenZeppelin upgradeable contracts
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
```

### Multi-Network Deployment

Deploy to multiple networks:

```javascript
// hardhat.config.js
networks: {
  worldchainSepolia: { /* testnet config */ },
  worldchain: { /* mainnet config */ },
  ethereum: { /* L1 config */ },
}
```

### Integration with Other Protocols

Consider integrating with:
- DEXs for token trading
- Lending protocols
- NFT marketplaces
- Cross-chain bridges

## Resources

- [World Chain Documentation](https://docs.world.org/world-chain)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Blockscout Explorer](https://worldchain-sepolia.blockscout.com)
