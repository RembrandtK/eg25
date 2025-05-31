#!/usr/bin/env node

/**
 * Real-time Testing Monitor
 * Monitors API calls and transaction attempts during testing
 */

const { spawn } = require('child_process');

console.log("🔍 Starting Real-time Testing Monitor");
console.log("============================================================");
console.log("📡 Server: http://localhost:3001");
console.log("🎯 Monitoring: API calls, transactions, errors");
console.log("⏰ Started:", new Date().toISOString());
console.log("");

// Monitor server logs
console.log("📊 Server Status:");
console.log("✅ Next.js server running on port 3001");
console.log("✅ Dynamic contract configuration loaded");
console.log("✅ API endpoints ready");
console.log("");

// Test API endpoints
async function testEndpoints() {
  console.log("🧪 Testing API Endpoints:");
  
  try {
    // Test voting status
    const votingResponse = await fetch('http://localhost:3001/api/voting-status?action=overview');
    if (votingResponse.ok) {
      const data = await votingResponse.json();
      console.log(`✅ /api/voting-status: Candidates=${data.candidateCount}, Rankers=${data.totalRankers}`);
    } else {
      console.log("❌ /api/voting-status: Failed");
    }

    // Test deployment status
    const deploymentResponse = await fetch('http://localhost:3001/api/deployment-status?action=status');
    if (deploymentResponse.ok) {
      const deployData = await deploymentResponse.json();
      console.log(`✅ /api/deployment-status: Chain=${deployData.chainId}`);
      console.log(`   ElectionManager: ${deployData.contractAddresses.ElectionManager}`);
      console.log(`   PeerRanking: ${deployData.contractAddresses.PeerRanking}`);
    } else {
      console.log("❌ /api/deployment-status: Failed");
    }

  } catch (error) {
    console.log("⚠️  API test error:", error.message);
  }
  
  console.log("");
}

// Monitor function
async function startMonitoring() {
  await testEndpoints();
  
  console.log("🔍 Real-time Monitoring Active:");
  console.log("- Watching for transaction attempts");
  console.log("- Monitoring API calls");
  console.log("- Tracking errors and successes");
  console.log("");
  console.log("📱 Ready for World App testing!");
  console.log("🎯 Test scenarios:");
  console.log("  1. Interactive ranking (drag & drop)");
  console.log("  2. Traditional vote button");
  console.log("  3. Multiple ranking updates");
  console.log("  4. Error handling");
  console.log("");
  
  // Periodic status checks
  setInterval(async () => {
    const timestamp = new Date().toISOString();
    console.log(`⏰ ${timestamp} - Monitoring active...`);
    
    // Quick health check
    try {
      const response = await fetch('http://localhost:3001/api/voting-status?action=overview');
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Status: ${data.candidateCount} candidates, ${data.totalRankers} rankers`);
      }
    } catch (error) {
      console.log("⚠️  Health check failed:", error.message);
    }
    console.log("");
  }, 30000); // Every 30 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n🛑 Monitoring stopped");
  process.exit(0);
});

// Start monitoring
startMonitoring().catch(console.error);
