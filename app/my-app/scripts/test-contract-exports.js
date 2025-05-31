#!/usr/bin/env node

/**
 * Test Contract Exports
 * This script tests that the contract addresses are properly exported from the config
 */

// Import the contract addresses
const { ELECTION_MANAGER_ADDRESS, PEER_RANKING_ADDRESS } = require('../src/config/contracts.ts');

console.log("🧪 Testing Contract Address Exports");
console.log("============================================================");

console.log("Exported contract addresses:");
console.log(`ELECTION_MANAGER_ADDRESS: ${ELECTION_MANAGER_ADDRESS}`);
console.log(`PEER_RANKING_ADDRESS: ${PEER_RANKING_ADDRESS}`);

// Verify they match expected values
const expectedAddresses = {
  ELECTION_MANAGER_ADDRESS: "0x53c9a3D5B28593734d6945Fb8F54C9f3dDb48fC7",
  PEER_RANKING_ADDRESS: "0x2caDc553c4B98863A3937fF0E710b79F7E855d8a"
};

console.log("\n🔍 Verification:");
let allMatch = true;

Object.entries(expectedAddresses).forEach(([name, expected]) => {
  const actual = name === 'ELECTION_MANAGER_ADDRESS' ? ELECTION_MANAGER_ADDRESS : PEER_RANKING_ADDRESS;
  const matches = actual === expected;
  
  console.log(`${name}:`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual:   ${actual}`);
  console.log(`  Status:   ${matches ? '✅ MATCH' : '❌ MISMATCH'}`);
  
  if (!matches) {
    allMatch = false;
  }
});

console.log("\n📊 Summary:");
if (allMatch) {
  console.log("✅ All contract addresses properly exported!");
  console.log("✅ Centralized configuration working");
  console.log("✅ No hardcoded addresses needed");
} else {
  console.log("❌ Contract address export issues detected!");
}

process.exit(allMatch ? 0 : 1);
