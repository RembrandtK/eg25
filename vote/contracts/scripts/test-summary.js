const { execSync } = require('child_process');
const fs = require('fs');

console.log("🧪 COMPREHENSIVE TEST SUMMARY");
console.log("=" .repeat(50));

// Run tests and capture output
try {
  console.log("\n📊 Running all tests...\n");
  
  const testOutput = execSync('npm test', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  // Parse test results
  const lines = testOutput.split('\n');
  let passingTests = 0;
  let failingTests = 0;
  let testSuites = [];
  let currentSuite = null;
  
  for (const line of lines) {
    if (line.includes('✔')) {
      passingTests++;
    } else if (line.includes('failing')) {
      const match = line.match(/(\d+) failing/);
      if (match) {
        failingTests = parseInt(match[1]);
      }
    } else if (line.trim().match(/^[A-Z]/)) {
      // New test suite
      currentSuite = line.trim();
      if (!testSuites.includes(currentSuite)) {
        testSuites.push(currentSuite);
      }
    }
  }
  
  console.log("📈 TEST RESULTS SUMMARY");
  console.log("-".repeat(30));
  console.log(`✅ Passing Tests: ${passingTests}`);
  console.log(`❌ Failing Tests: ${failingTests}`);
  console.log(`📦 Test Suites: ${testSuites.length}`);
  console.log(`🎯 Success Rate: ${((passingTests / (passingTests + failingTests)) * 100).toFixed(1)}%`);
  
  console.log("\n🏗️ TEST SUITES COVERED");
  console.log("-".repeat(30));
  testSuites.forEach((suite, index) => {
    console.log(`${index + 1}. ${suite}`);
  });
  
  // Extract gas usage information
  console.log("\n⛽ GAS USAGE ANALYSIS");
  console.log("-".repeat(30));
  
  const gasLines = lines.filter(line => line.includes('gas'));
  const gasUsages = [];
  
  for (const line of gasLines) {
    const gasMatch = line.match(/([\d,]+)\s+gas/);
    if (gasMatch) {
      const gasAmount = parseInt(gasMatch[1].replace(/,/g, ''));
      gasUsages.push(gasAmount);
    }
  }
  
  if (gasUsages.length > 0) {
    const avgGas = gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length;
    const maxGas = Math.max(...gasUsages);
    const minGas = Math.min(...gasUsages);
    
    console.log(`📊 Average Gas Usage: ${Math.round(avgGas).toLocaleString()}`);
    console.log(`📈 Maximum Gas Usage: ${maxGas.toLocaleString()}`);
    console.log(`📉 Minimum Gas Usage: ${minGas.toLocaleString()}`);
  }
  
  // Test coverage analysis
  console.log("\n🎯 FEATURE COVERAGE");
  console.log("-".repeat(30));
  
  const features = [
    { name: "Basic Voting", tested: testOutput.includes("Should allow verified user to vote") },
    { name: "Ranking Updates", tested: testOutput.includes("Should handle ranking updates") },
    { name: "Pairwise Comparisons", tested: testOutput.includes("Pairwise Comparison Logic") },
    { name: "Condorcet Winner", tested: testOutput.includes("getCondorcetWinner") },
    { name: "Gas Optimization", tested: testOutput.includes("Gas Optimization Tests") },
    { name: "Error Handling", tested: testOutput.includes("Error Handling") },
    { name: "Integration Tests", tested: testOutput.includes("Integration Tests") },
    { name: "Stress Testing", tested: testOutput.includes("Stress Testing") },
    { name: "Edge Cases", tested: testOutput.includes("Edge Cases") },
    { name: "Algorithm Correctness", tested: testOutput.includes("Algorithm Implementation") }
  ];
  
  features.forEach(feature => {
    const status = feature.tested ? "✅" : "❌";
    console.log(`${status} ${feature.name}`);
  });
  
  console.log("\n🚀 DEPLOYMENT READINESS");
  console.log("-".repeat(30));
  
  const readinessChecks = [
    { name: "All Tests Passing", passed: failingTests === 0 },
    { name: "Gas Usage Reasonable", passed: gasUsages.length > 0 && Math.max(...gasUsages) < 2000000 },
    { name: "Error Handling Complete", passed: testOutput.includes("Error Handling") },
    { name: "Integration Verified", passed: testOutput.includes("Integration Tests") },
    { name: "Algorithm Tested", passed: testOutput.includes("Condorcet") }
  ];
  
  const passedChecks = readinessChecks.filter(check => check.passed).length;
  const totalChecks = readinessChecks.length;
  
  readinessChecks.forEach(check => {
    const status = check.passed ? "✅" : "❌";
    console.log(`${status} ${check.name}`);
  });
  
  console.log(`\n🎯 Deployment Readiness: ${passedChecks}/${totalChecks} (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
  
  if (passedChecks === totalChecks) {
    console.log("\n🎉 CONTRACTS ARE READY FOR DEPLOYMENT! 🎉");
  } else {
    console.log("\n⚠️  Some checks failed. Review before deployment.");
  }
  
  // Generate test report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passingTests,
      failingTests,
      testSuites: testSuites.length,
      successRate: ((passingTests / (passingTests + failingTests)) * 100).toFixed(1)
    },
    gasAnalysis: gasUsages.length > 0 ? {
      average: Math.round(gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length),
      maximum: Math.max(...gasUsages),
      minimum: Math.min(...gasUsages),
      samples: gasUsages.length
    } : null,
    featureCoverage: features,
    deploymentReadiness: {
      score: `${passedChecks}/${totalChecks}`,
      percentage: ((passedChecks/totalChecks)*100).toFixed(1),
      ready: passedChecks === totalChecks
    }
  };
  
  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  console.log("\n📄 Detailed report saved to test-report.json");
  
} catch (error) {
  console.error("❌ Error running tests:", error.message);
  process.exit(1);
}

console.log("\n" + "=".repeat(50));
console.log("🏁 TEST SUMMARY COMPLETE");
