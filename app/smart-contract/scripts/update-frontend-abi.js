const fs = require('fs');
const path = require('path');

// Read the compiled contract artifact
const artifactPath = path.join(__dirname, '../artifacts/contracts/PeerRanking.sol/PeerRanking.json');
const frontendAbiPath = path.join(__dirname, '../../my-app/src/peer-ranking-abi.ts');

try {
  // Read the artifact
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;

  // Generate the TypeScript file content
  const tsContent = `// Contract address is now managed centrally in @/config/contracts
// Use PEER_RANKING_ADDRESS from there instead
// 
// This ABI was auto-generated from the compiled contract
// Last updated: ${new Date().toISOString()}

export const PEER_RANKING_ABI = ${JSON.stringify(abi, null, 2)} as const;
`;

  // Write the updated ABI file
  fs.writeFileSync(frontendAbiPath, tsContent);
  
  console.log('✅ Successfully updated PeerRanking ABI in frontend');
  console.log(`📁 Updated file: ${frontendAbiPath}`);
  console.log(`📊 ABI contains ${abi.length} functions/events`);
  
  // List the new functions
  const functions = abi.filter(item => item.type === 'function').map(item => item.name);
  const events = abi.filter(item => item.type === 'event').map(item => item.name);
  
  console.log('\n🔧 Available Functions:');
  functions.forEach(fn => console.log(`  - ${fn}`));
  
  console.log('\n📡 Available Events:');
  events.forEach(event => console.log(`  - ${event}`));
  
  // Check for new tie-related functions
  const tieFunctions = functions.filter(fn => 
    fn.includes('Tie') || 
    fn.includes('RankingEntry') || 
    fn.includes('Legacy') ||
    fn.includes('FullComparison') ||
    fn.includes('Condorcet')
  );
  
  if (tieFunctions.length > 0) {
    console.log('\n🎯 New Tie-Related Functions:');
    tieFunctions.forEach(fn => console.log(`  - ${fn}`));
  }

} catch (error) {
  console.error('❌ Error updating ABI:', error.message);
  process.exit(1);
}
