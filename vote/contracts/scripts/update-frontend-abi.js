const fs = require('fs');
const path = require('path');

// Contract configurations
const contracts = [
  {
    name: 'Election',
    artifactPath: path.join(__dirname, '../artifacts/contracts/Election.sol/Election.json'),
    frontendPath: path.join(__dirname, '../../world-app/src/election-abi.ts'),
    exportName: 'ELECTION_ABI'
  },
  {
    name: 'ElectionManager',
    artifactPath: path.join(__dirname, '../artifacts/contracts/ElectionManager.sol/ElectionManager.json'),
    frontendPath: path.join(__dirname, '../../world-app/src/election-manager-abi.ts'),
    exportName: 'ELECTION_MANAGER_ABI'
  }
];

function extractABI(contract) {
  try {
    console.log(`\n🔄 Processing ${contract.name}...`);

    // Check if artifact exists
    if (!fs.existsSync(contract.artifactPath)) {
      console.log(`⚠️  Artifact not found: ${contract.artifactPath}`);
      console.log(`   Run 'npx hardhat compile' first`);
      return false;
    }

    // Read the artifact
    const artifact = JSON.parse(fs.readFileSync(contract.artifactPath, 'utf8'));
    const abi = artifact.abi;

    // Generate the TypeScript file content
    const tsContent = `// Contract address is now managed centrally in @/config/contracts
// Use ELECTION_MANAGER_ADDRESS from there instead
//
// This ABI was auto-generated from the compiled contract
// Last updated: ${new Date().toISOString()}

export const ${contract.exportName} = ${JSON.stringify(abi, null, 2)} as const;
`;

    // Write the updated ABI file
    fs.writeFileSync(contract.frontendPath, tsContent);

    console.log(`✅ Successfully updated ${contract.name} ABI in frontend`);
    console.log(`📁 Updated file: ${contract.frontendPath}`);
    console.log(`📊 ABI contains ${abi.length} functions/events`);

    // List the new functions
    const functions = abi.filter(item => item.type === 'function').map(item => item.name);
    const events = abi.filter(item => item.type === 'event').map(item => item.name);

    console.log('\n🔧 Available Functions:');
    functions.forEach(fn => console.log(`  - ${fn}`));

    console.log('\n📡 Available Events:');
    events.forEach(event => console.log(`  - ${event}`));

    // Check for voting-related functions
    const votingFunctions = functions.filter(fn =>
      fn.includes('vote') ||
      fn.includes('Vote') ||
      fn.includes('ranking') ||
      fn.includes('Ranking') ||
      fn.includes('candidate') ||
      fn.includes('Candidate') ||
      fn.includes('election') ||
      fn.includes('Election')
    );

    if (votingFunctions.length > 0) {
      console.log('\n🗳️  Voting-Related Functions:');
      votingFunctions.forEach(fn => console.log(`  - ${fn}`));
    }

    return true;
  } catch (error) {
    console.error(`❌ Error updating ${contract.name} ABI:`, error.message);
    return false;
  }
}

// Main execution
console.log('🔄 Extracting contract ABIs for frontend...');

let allSuccess = true;
for (const contract of contracts) {
  const success = extractABI(contract);
  if (!success) {
    allSuccess = false;
  }
}

if (allSuccess) {
  console.log('\n🎉 All contract ABIs updated successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Update frontend components to use new ABIs');
  console.log('2. Remove old PeerRanking references');
  console.log('3. Test contract interactions');
} else {
  console.log('\n❌ Some ABI extractions failed');
  console.log('🔧 Make sure contracts are compiled: npx hardhat compile');
  process.exit(1);
}
