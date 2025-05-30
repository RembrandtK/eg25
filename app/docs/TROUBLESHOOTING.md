# Troubleshooting Guide

This guide covers common issues and solutions when developing with the World Mini App template.

## Installation Issues

### Node.js Version Problems

**Error**: `The engine "node" is incompatible with this module`

**Solution**:
```bash
# Check your Node.js version
node --version

# Install Node.js 18+ if needed
# Using nvm (recommended):
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### pnpm Installation Issues

**Error**: `pnpm: command not found`

**Solution**:
```bash
# Install pnpm globally
npm install -g pnpm

# Or using corepack (Node.js 16+)
corepack enable
corepack prepare pnpm@latest --activate
```

### Dependency Installation Failures

**Error**: Various npm/pnpm installation errors

**Solution**:
```bash
# Clear package manager cache
pnpm store prune
npm cache clean --force

# Delete node_modules and lock files
rm -rf node_modules package-lock.json pnpm-lock.yaml

# Reinstall dependencies
pnpm install
```

## Environment Configuration Issues

### Missing Environment Variables

**Error**: `process.env.NEXT_PUBLIC_WLD_APP_ID is undefined`

**Solution**:
1. Ensure `.env.local` exists in the `my-app` directory
2. Check variable names match exactly (case-sensitive)
3. Restart the development server after changes

```bash
# Correct format in my-app/.env.local
NEXT_PUBLIC_WLD_APP_ID="app_your_app_id_here"
NEXT_PUBLIC_WLD_ACTION_ID="vote"
```

### Invalid World ID App Configuration

**Error**: World ID verification fails

**Solution**:
1. Verify your App ID in the [Developer Portal](https://developer.worldcoin.org)
2. Ensure the action "vote" exists in your app configuration
3. Check that your app is configured for on-chain verification

## Smart Contract Issues

### Deployment Failures

**Error**: `insufficient funds for gas * price + value`

**Solution**:
```bash
# Get testnet ETH from faucet
# Visit: https://faucet.worldchain.org
# Connect your wallet and request ETH
```

**Error**: `HH110: Invalid JSON-RPC response received`

**Solution**:
```bash
# Update RPC URL in smart-contract/.env
WORLD_CHAIN_SEPOLIA_RPC="https://worldchain-sepolia.g.alchemy.com/public"
```

**Error**: `HH101: Hardhat was set to use chain id X, but connected to a chain with id Y`

**Solution**:
Update `hardhat.config.js` with correct chain ID:
```javascript
worldchain: {
  chainId: 4801,  // World Chain Sepolia
  // chainId: 480,   // World Chain Mainnet
}
```

### Contract Verification Issues

**Error**: `Verification failed`

**Solution**:
1. Ensure exact compiler version match
2. Check constructor parameters are correct
3. Try manual verification on Blockscout

```bash
# Get exact compiler version
npx hardhat compile --show-stack-traces

# Verify with exact parameters
npx hardhat verify --network worldchain <ADDRESS> "0x0000000000000000000000000000000000000000"
```

### Contract Interaction Errors

**Error**: `Address not verified`

**Solution**:
- For testnet: World ID verification is disabled (using zero address)
- For mainnet: User needs valid World ID verification
- Check World ID Address Book configuration

**Error**: `Your claim is not available yet`

**Solution**:
- User must wait 5 minutes between claims
- Check `lastMint` timestamp for the user

## Mini App Runtime Issues

### NextAuth Errors

**Error**: `[next-auth][error][NO_SECRET]`

**Solution**:
Add to `my-app/.env.local`:
```bash
NEXTAUTH_SECRET="your-random-secret-key-here"
```

**Error**: `[next-auth][error][SIGNIN_EMAIL_ERROR]`

**Solution**:
Check NEXTAUTH_URL configuration:
```bash
NEXTAUTH_URL="http://localhost:3001"
```

### Wallet Connection Issues

**Error**: Wallet connection fails in World App

**Solution**:
1. Ensure you're testing in World App (not regular browser)
2. Check NGROK URL is correctly configured
3. Verify SSL certificate is valid (NGROK provides HTTPS)

### World ID Verification Failures

**Error**: Verification popup doesn't appear

**Solution**:
1. Check App ID and Action ID are correct
2. Ensure you're using World App (not browser)
3. Verify your World ID account is properly set up

**Error**: `Verification failed` after completing World ID flow

**Solution**:
1. Check network connectivity
2. Verify API endpoints are accessible
3. Check browser console for detailed errors

## Development Server Issues

### Port Conflicts

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
pnpm dev -- --port 3001
```

### Hot Reload Not Working

**Error**: Changes not reflected in browser

**Solution**:
1. Check file paths are correct
2. Restart development server
3. Clear browser cache
4. Check for TypeScript errors

### Build Failures

**Error**: `Type error: Cannot find module`

**Solution**:
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Install missing type definitions
pnpm add -D @types/missing-package
```

## Mobile Testing Issues

### NGROK Connection Problems

**Error**: NGROK tunnel not accessible

**Solution**:
```bash
# Restart NGROK with new tunnel
ngrok http 3001

# Check NGROK status
curl -s http://localhost:4040/api/tunnels
```

**Error**: `Invalid Host header`

**Solution**:
Add to `next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ]
  },
}
```

### World App Integration Issues

**Error**: Mini App doesn't load in World App

**Solution**:
1. Ensure HTTPS URL (NGROK provides this)
2. Check World ID app configuration
3. Verify QR code is current
4. Test URL in regular browser first

## Network and Connectivity Issues

### RPC Connection Failures

**Error**: `Network request failed`

**Solution**:
```bash
# Test RPC connectivity
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://worldchain-sepolia.g.alchemy.com/public
```

### Transaction Failures

**Error**: `Transaction reverted without a reason string`

**Solution**:
1. Check contract address is correct
2. Verify function parameters
3. Ensure sufficient gas limit
4. Check contract state (e.g., cooldown period)

## Performance Issues

### Slow Loading Times

**Solution**:
1. Optimize bundle size
2. Use dynamic imports for large components
3. Implement proper caching strategies
4. Consider using a CDN

### High Gas Costs

**Solution**:
1. Optimize contract functions
2. Batch multiple operations
3. Use appropriate gas price
4. Consider Layer 2 solutions

## Debugging Tips

### Enable Debug Logging

```bash
# Enable Next.js debug mode
DEBUG=* pnpm dev

# Enable Hardhat debug mode
npx hardhat run scripts/deploy.js --verbose
```

### Browser Developer Tools

1. Open browser console (F12)
2. Check Network tab for failed requests
3. Look for JavaScript errors
4. Monitor WebSocket connections

### Contract Debugging

```solidity
// Add console.log to contracts (development only)
import "hardhat/console.sol";

function claim() external {
    console.log("Claim called by:", msg.sender);
    console.log("Last mint:", lastMint[msg.sender]);
    console.log("Current time:", block.timestamp);
}
```

## Getting Help

### Community Resources

- [World Discord](https://world.org/discord)
- [World Documentation](https://docs.world.org/)
- [GitHub Issues](https://github.com/worldcoin)

### Professional Support

- [World Developer Portal](https://developer.worldcoin.org)
- Technical support through official channels

### Reporting Bugs

When reporting issues, include:
1. Error messages (full stack trace)
2. Environment details (OS, Node.js version, etc.)
3. Steps to reproduce
4. Expected vs actual behavior
5. Relevant configuration files

### Emergency Procedures

**Critical Production Issues**:
1. Immediately pause affected functionality
2. Document the issue thoroughly
3. Contact World support if needed
4. Prepare rollback plan if necessary

**Security Concerns**:
1. Do not share private keys or sensitive data
2. Report security issues through proper channels
3. Follow responsible disclosure practices
