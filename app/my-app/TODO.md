# TODO: Election Voting App Issues & Next Steps

## 🚨 **Current Known Issues**

### **1. Temporary Mock Transactions**
- **Status**: Currently using mock transactions for UI testing
- **Issue**: Votes are not actually persisted to blockchain
- **Impact**: Rankings reset when user leaves and returns to app
- **Location**: `src/hooks/usePeerRanking.ts` lines 90-101 and 211-222
- **Fix Required**: Uncomment real MiniKit transaction code and resolve action handler issues

### **2. Contract Reading Failures**
- **Error**: `ContractFunctionExecutionError: HTTP request failed`
- **Details**:
  ```
  URL: https://worldchain-sepolia.g.alchemy.com/public
  Request body: {"method":"eth_call","params":[{"data":"0x3d6931e80000000000000000000000003c6c2348d430996285672346258afb8528086d5a","to":"0x2caDc553c4B98863A3937fF0E710b79F7E855d8a"},"pending"]}
  
  Raw Call Arguments:
    to:    0x2caDc553c4B98863A3937fF0E710b79F7E855d8a (PeerRanking contract)
    data:  0x3d6931e80000000000000000000000003c6c2348d430996285672346258afb8528086d5a (getUserRanking call)
  ```
- **Function**: `getUserRanking(address)` call failing
- **Impact**: Rankings don't load from contract, always start empty
- **Possible Causes**:
  - Contract not deployed to Worldchain Sepolia
  - Wrong contract address
  - RPC endpoint issues
  - Function signature mismatch

### **3. MiniKit Action Handler Issues**
- **Error**: "No handler for event miniapp-send-transaction"
- **Details**: `{"error_code": "user_rejected", "status": "error"}`
- **Impact**: Real transactions fail when attempted
- **Root Cause**: Action handler registration not working properly
- **Location**: `src/providers/minikit-provider.tsx`

## 🔧 **Immediate Fixes Needed**

### **Priority 1: Contract Reading**
1. **Verify contract deployment**:
   ```bash
   # Check if contract exists on Worldchain Sepolia
   cast code 0x2caDc553c4B98863A3937fF0E710b79F7E855d8a --rpc-url https://worldchain-sepolia.g.alchemy.com/public
   ```

2. **Test contract function directly**:
   ```bash
   # Test getUserRanking function
   cast call 0x2caDc553c4B98863A3937fF0E710b79F7E855d8a "getUserRanking(address)" 0x3c6c2348d430996285672346258afb8528086d5a --rpc-url https://worldchain-sepolia.g.alchemy.com/public
   ```

3. **Alternative RPC endpoints**:
   - Try different Worldchain Sepolia RPC
   - Consider using Infura/Alchemy with API key
   - Test with local node if available

### **Priority 2: Enable Real Transactions**
1. **Fix MiniKit action handlers**:
   - Research correct MiniKit action registration method
   - Test with simpler transaction first
   - Verify World ID action configuration

2. **Uncomment transaction code**:
   - Remove mock transaction simulation
   - Enable real `MiniKit.commandsAsync.sendTransaction` calls
   - Test with proper error handling

### **Priority 3: World ID Integration**
1. **Verify World ID setup**:
   - Confirm `app_10719845a0977ef63ebe8eb9edb890ad` configuration
   - Test `vote` action in World Developer Portal
   - Ensure on-chain verification is properly configured

## 📋 **Development Workflow**

### **Phase 1: Fix Contract Reading**
- [ ] Verify contract deployment status
- [ ] Test RPC connectivity and function calls
- [ ] Fix `getUserRanking` function calls
- [ ] Verify rankings load correctly on app return

### **Phase 2: Enable Real Transactions**
- [ ] Research and fix MiniKit action handler registration
- [ ] Test simple transaction without World ID first
- [ ] Enable real blockchain writes
- [ ] Verify transaction persistence

### **Phase 3: Full World ID Integration**
- [ ] Integrate World ID verification flow
- [ ] Handle verification + transaction sequence
- [ ] Test end-to-end on-chain verification
- [ ] Deploy to production

## 🧪 **Testing Strategy**

### **Contract Testing**
```bash
# Test contract deployment
cast code $CONTRACT_ADDRESS --rpc-url $RPC_URL

# Test function calls
cast call $CONTRACT_ADDRESS "getUserRanking(address)" $USER_ADDRESS --rpc-url $RPC_URL
cast call $CONTRACT_ADDRESS "getTotalRankers()" --rpc-url $RPC_URL

# Test with different RPC endpoints
```

### **API Testing**
```bash
# Test voting status API
curl "http://localhost:3000/api/voting-status?action=overview"
curl "http://localhost:3000/api/voting-status?action=user-ranking&address=0x3c6c2348d430996285672346258afb8528086d5a"
```

### **MiniKit Testing**
- Test in World App simulator
- Test with real World App on mobile
- Verify action handler registration in browser console

## 📝 **Notes**

### **Current Working Features**
- ✅ Interactive ranking UI with smooth UX
- ✅ Status icon feedback system
- ✅ Mock transaction flow
- ✅ Voting dashboard for data visualization
- ✅ API endpoints for contract reading
- ✅ World ID verification (separate from ranking)

### **Architecture Decisions**
- Using viem for contract interactions
- Separate mock/real transaction modes
- Status icon instead of moving notifications
- Standalone voting dashboard for broader access

### **Contract Addresses**
- **PeerRanking**: `0x2caDc553c4B98863A3937fF0E710b79F7E855d8a`
- **ElectionManager**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Network**: Worldchain Sepolia

### **World ID Configuration**
- **App ID**: `app_10719845a0977ef63ebe8eb9edb890ad`
- **Action**: `vote` (configured for on-chain verification)
- **Verification Level**: Orb required

## 🎯 **Success Criteria**

### **Minimum Viable Product**
- [ ] Rankings persist between app sessions
- [ ] Real blockchain transactions work
- [ ] Contract reading functions properly
- [ ] Voting dashboard shows live data

### **Full Feature Set**
- [ ] World ID verification integrated with transactions
- [ ] On-chain verification working end-to-end
- [ ] Production deployment ready
- [ ] Comprehensive error handling and user feedback
