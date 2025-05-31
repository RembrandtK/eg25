const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment to World Chain...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // World ID Address Book contract address
  let WORLD_ID_ADDRESS_BOOK = process.env.WORLD_ID_ADDRESS_BOOK || "0x0000000000000000000000000000000000000000";

  // Deploy mock World ID Address Book for testing if using zero address
  if (WORLD_ID_ADDRESS_BOOK === "0x0000000000000000000000000000000000000000") {
    console.log("📝 Deploying Mock World ID Address Book for testing...");

    const MockWorldIDAddressBook = await ethers.getContractFactory("MockWorldIDAddressBook");
    const mockAddressBook = await MockWorldIDAddressBook.deploy();
    await mockAddressBook.waitForDeployment();

    WORLD_ID_ADDRESS_BOOK = await mockAddressBook.getAddress();
    console.log("✅ Mock World ID Address Book deployed to:", WORLD_ID_ADDRESS_BOOK);

    // Verify the deployer address for testing
    const verifyTx = await mockAddressBook.setAddressVerifiedUntil(
      deployer.address,
      Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year from now
    );
    await verifyTx.wait();
    console.log("✅ Deployer address verified in mock contract");
  } else {
    console.log("🔗 Using existing World ID Address Book:", WORLD_ID_ADDRESS_BOOK);
  }

  // Deploy TUTE contract
  console.log("\nDeploying TUTE contract...");
  const TUTE = await ethers.getContractFactory("TUTE");
  const tute = await TUTE.deploy(WORLD_ID_ADDRESS_BOOK);

  await tute.waitForDeployment();
  const tuteAddress = await tute.getAddress();

  console.log("✅ TUTE contract deployed to:", tuteAddress);

  // Verify deployment
  console.log("\nVerifying deployment...");
  const name = await tute.name();
  const symbol = await tute.symbol();
  const claimAmount = await tute.CLAIM_AMOUNT();
  const claimFrequency = await tute.CLAIM_FREQUENCY_SECONDS();

  console.log("Contract details:");
  console.log("- Name:", name);
  console.log("- Symbol:", symbol);
  console.log("- Claim Amount:", ethers.formatEther(claimAmount), "TUTE");
  console.log("- Claim Frequency:", claimFrequency.toString(), "seconds");
  console.log("- World ID Address Book:", await tute.worldAddressBook());

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      TUTE: {
        address: tuteAddress,
        constructorArgs: [WORLD_ID_ADDRESS_BOOK]
      }
    },
    timestamp: new Date().toISOString()
  };

  console.log("\n📋 Deployment Summary:");
  console.log("Network:", deploymentInfo.network);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("TUTE Contract:", tuteAddress);
  console.log("Transaction hash:", tute.deploymentTransaction()?.hash);

  console.log("\n🔗 Add this to your Mini App .env.local:");
  console.log(`NEXT_PUBLIC_TUTE_CONTRACT_ADDRESS="${tuteAddress}"`);

  console.log("\n📝 To verify the contract, run:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${tuteAddress} "${WORLD_ID_ADDRESS_BOOK}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
