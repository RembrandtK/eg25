// Quick test to verify RPC configuration
const { CURRENT_NETWORK } = require('./src/config/contracts.ts');

console.log('🔍 Testing RPC Configuration...');
console.log('CURRENT_NETWORK.rpcUrl:', CURRENT_NETWORK.rpcUrl);
console.log('Environment NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC:', process.env.NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC);

if (CURRENT_NETWORK.rpcUrl.includes('quiknode.pro')) {
  console.log('✅ Using QuickNode premium RPC');
} else {
  console.log('⚠️ Using public RPC fallback');
}
