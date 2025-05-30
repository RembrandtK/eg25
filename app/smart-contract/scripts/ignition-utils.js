const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

// Get the chain ID for the current network
async function getChainId() {
  const network = await ethers.provider.getNetwork();
  return network.chainId.toString();
}

// Get deployment directory for current network
async function getDeploymentDir() {
  const chainId = await getChainId();
  return path.join(__dirname, "../ignition/deployments", `chain-${chainId}`);
}

// Load deployed addresses from Ignition
async function getDeployedAddresses() {
  const deploymentDir = await getDeploymentDir();
  const addressesFile = path.join(deploymentDir, "deployed_addresses.json");
  
  if (!fs.existsSync(addressesFile)) {
    throw new Error(`No deployments found for current network. Deploy first with: pnpm run deploy:ignition:sepolia`);
  }
  
  return JSON.parse(fs.readFileSync(addressesFile, "utf8"));
}

// Get specific contract address
async function getContractAddress(contractName) {
  const addresses = await getDeployedAddresses();
  const fullName = Object.keys(addresses).find(key => key.includes(contractName));
  
  if (!fullName) {
    throw new Error(`Contract ${contractName} not found in deployments`);
  }
  
  return addresses[fullName];
}

// Get contract instance from Ignition deployment
async function getDeployedContract(contractName) {
  const address = await getContractAddress(contractName);
  return await ethers.getContractAt(contractName, address);
}

// Display deployment summary
async function showDeploymentSummary() {
  try {
    const addresses = await getDeployedAddresses();
    const chainId = await getChainId();
    
    console.log("🚀 Ignition Deployment Summary");
    console.log("=" .repeat(50));
    console.log(`Network: World Chain ${chainId === "4801" ? "Sepolia" : "Mainnet"} (Chain ID: ${chainId})`);
    console.log(`Deployment Directory: ignition/deployments/chain-${chainId}/`);
    console.log("");
    
    console.log("📋 Deployed Contracts:");
    Object.entries(addresses).forEach(([name, address]) => {
      const contractName = name.split("#")[1];
      console.log(`  ${contractName}: ${address}`);
    });
    
    console.log("");
    console.log("🔗 Useful Links:");
    
    if (chainId === "4801") {
      Object.entries(addresses).forEach(([name, address]) => {
        const contractName = name.split("#")[1];
        console.log(`  ${contractName} on Blockscout: https://worldchain-sepolia.blockscout.com/address/${address}`);
      });
    } else {
      Object.entries(addresses).forEach(([name, address]) => {
        const contractName = name.split("#")[1];
        console.log(`  ${contractName} on Blockscout: https://worldscan.org/address/${address}`);
      });
    }
    
    console.log("");
    console.log("📝 Next Steps:");
    console.log("  1. Update Mini App .env.local with TUTE contract address");
    console.log("  2. Verify contracts: pnpm run verify:worldchain");
    console.log("  3. Test address verification with mock contract");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Verify addresses in mock contract
async function verifyTestAddresses(addresses) {
  try {
    const mockAddressBook = await getDeployedContract("MockWorldIDAddressBook");
    const verificationDuration = 365 * 24 * 60 * 60; // 1 year
    const verifiedUntil = Math.floor(Date.now() / 1000) + verificationDuration;
    
    console.log("🔐 Verifying addresses in Mock World ID Address Book...");
    console.log(`Mock Contract: ${await mockAddressBook.getAddress()}`);
    console.log("");
    
    for (const address of addresses) {
      try {
        console.log(`📝 Verifying: ${address}`);
        const tx = await mockAddressBook.setAddressVerifiedUntil(address, verifiedUntil);
        await tx.wait();
        console.log(`✅ Verified: ${address}`);
      } catch (error) {
        console.error(`❌ Failed to verify ${address}:`, error.message);
      }
    }
    
    console.log("");
    console.log("🎉 Address verification complete!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Check verification status
async function checkVerificationStatus(addresses) {
  try {
    const mockAddressBook = await getDeployedContract("MockWorldIDAddressBook");
    
    console.log("🔍 Checking verification status...");
    console.log(`Mock Contract: ${await mockAddressBook.getAddress()}`);
    console.log("");
    
    for (const address of addresses) {
      try {
        const verifiedUntil = await mockAddressBook.addressVerifiedUntil(address);
        const isVerified = verifiedUntil > Math.floor(Date.now() / 1000);
        
        console.log(`Address: ${address}`);
        console.log(`Status: ${isVerified ? "✅ Verified" : "❌ Not Verified"}`);
        
        if (verifiedUntil > 0) {
          const date = new Date(Number(verifiedUntil) * 1000);
          console.log(`Verified Until: ${date.toLocaleString()}`);
        }
        console.log("-".repeat(40));
        
      } catch (error) {
        console.error(`❌ Failed to check ${address}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Generate Mini App environment variables
async function generateEnvVars() {
  try {
    const addresses = await getDeployedAddresses();
    const tuteAddress = await getContractAddress("TUTE");
    const chainId = await getChainId();
    
    console.log("📝 Mini App Environment Variables:");
    console.log("=" .repeat(50));
    console.log("Add these to your my-app/.env.local file:");
    console.log("");
    console.log(`NEXT_PUBLIC_TUTE_CONTRACT_ADDRESS="${tuteAddress}"`);
    console.log(`NEXT_PUBLIC_CHAIN_ID="${chainId}"`);
    
    if (chainId === "4801") {
      console.log(`NEXT_PUBLIC_NETWORK_NAME="World Chain Sepolia"`);
      console.log(`NEXT_PUBLIC_BLOCK_EXPLORER="https://worldchain-sepolia.blockscout.com"`);
    } else {
      console.log(`NEXT_PUBLIC_NETWORK_NAME="World Chain"`);
      console.log(`NEXT_PUBLIC_BLOCK_EXPLORER="https://worldscan.org"`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case "summary":
      await showDeploymentSummary();
      break;
      
    case "verify":
      if (args.length < 2) {
        console.log("Usage: pnpm run ignition-utils verify <address1,address2,...>");
        return;
      }
      const addressesToVerify = args[1].split(",");
      await verifyTestAddresses(addressesToVerify);
      break;
      
    case "check":
      if (args.length < 2) {
        console.log("Usage: pnpm run ignition-utils check <address1,address2,...>");
        return;
      }
      const addressesToCheck = args[1].split(",");
      await checkVerificationStatus(addressesToCheck);
      break;
      
    case "env":
      await generateEnvVars();
      break;
      
    default:
      console.log("🔧 Ignition Utilities");
      console.log("Available commands:");
      console.log("  summary                          - Show deployment summary");
      console.log("  verify <address1,address2,...>   - Verify addresses in mock contract");
      console.log("  check <address1,address2,...>    - Check verification status");
      console.log("  env                              - Generate Mini App env vars");
      break;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  getDeployedAddresses,
  getContractAddress,
  getDeployedContract,
  showDeploymentSummary,
  verifyTestAddresses,
  checkVerificationStatus,
  generateEnvVars,
};
