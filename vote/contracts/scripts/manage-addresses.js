const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Local address book file
const ADDRESS_BOOK_FILE = path.join(__dirname, "../local-address-book.json");

// Load or create local address book
function loadAddressBook() {
  if (fs.existsSync(ADDRESS_BOOK_FILE)) {
    return JSON.parse(fs.readFileSync(ADDRESS_BOOK_FILE, "utf8"));
  }
  return {
    addresses: [],
    lastUpdated: new Date().toISOString(),
  };
}

// Save address book
function saveAddressBook(addressBook) {
  addressBook.lastUpdated = new Date().toISOString();
  fs.writeFileSync(ADDRESS_BOOK_FILE, JSON.stringify(addressBook, null, 2));
}

// Add address to local book
function addAddress(address, name = "", notes = "") {
  const addressBook = loadAddressBook();
  
  // Check if address already exists
  const existingIndex = addressBook.addresses.findIndex(
    (entry) => entry.address.toLowerCase() === address.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    // Update existing entry
    addressBook.addresses[existingIndex] = {
      ...addressBook.addresses[existingIndex],
      name: name || addressBook.addresses[existingIndex].name,
      notes: notes || addressBook.addresses[existingIndex].notes,
      lastUpdated: new Date().toISOString(),
    };
    console.log(`📝 Updated address: ${address}`);
  } else {
    // Add new entry
    addressBook.addresses.push({
      address: address.toLowerCase(),
      name: name || `Address ${addressBook.addresses.length + 1}`,
      notes,
      addedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      verified: false,
      verifiedUntil: null,
    });
    console.log(`✅ Added new address: ${address}`);
  }
  
  saveAddressBook(addressBook);
  return addressBook;
}

// Remove address from local book
function removeAddress(address) {
  const addressBook = loadAddressBook();
  const initialLength = addressBook.addresses.length;
  
  addressBook.addresses = addressBook.addresses.filter(
    (entry) => entry.address.toLowerCase() !== address.toLowerCase()
  );
  
  if (addressBook.addresses.length < initialLength) {
    saveAddressBook(addressBook);
    console.log(`🗑️  Removed address: ${address}`);
    return true;
  } else {
    console.log(`❌ Address not found: ${address}`);
    return false;
  }
}

// List all addresses
function listAddresses() {
  const addressBook = loadAddressBook();
  
  if (addressBook.addresses.length === 0) {
    console.log("📭 No addresses in local address book");
    return;
  }
  
  console.log("📋 Local Address Book:");
  console.log("=" .repeat(80));
  
  addressBook.addresses.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.name}`);
    console.log(`   Address: ${entry.address}`);
    console.log(`   Verified: ${entry.verified ? "✅ Yes" : "❌ No"}`);
    if (entry.verifiedUntil) {
      const date = new Date(entry.verifiedUntil * 1000);
      console.log(`   Verified Until: ${date.toLocaleString()}`);
    }
    if (entry.notes) {
      console.log(`   Notes: ${entry.notes}`);
    }
    console.log(`   Added: ${new Date(entry.addedAt).toLocaleString()}`);
    console.log("-".repeat(40));
  });
}

// Verify addresses on-chain
async function verifyAddresses(mockAddressBookAddress, addresses = null) {
  const addressBook = loadAddressBook();
  const addressesToVerify = addresses || addressBook.addresses.map(entry => entry.address);
  
  if (addressesToVerify.length === 0) {
    console.log("❌ No addresses to verify");
    return;
  }
  
  console.log(`🔗 Connecting to Mock Address Book: ${mockAddressBookAddress}`);
  
  const mockAddressBook = await ethers.getContractAt("MockWorldIDAddressBook", mockAddressBookAddress);
  const verificationDuration = 365 * 24 * 60 * 60; // 1 year
  const verifiedUntil = Math.floor(Date.now() / 1000) + verificationDuration;
  
  for (const address of addressesToVerify) {
    try {
      console.log(`📝 Verifying address: ${address}`);
      const tx = await mockAddressBook.setAddressVerifiedUntil(address, verifiedUntil);
      await tx.wait();
      
      // Update local address book
      const entry = addressBook.addresses.find(
        (entry) => entry.address.toLowerCase() === address.toLowerCase()
      );
      if (entry) {
        entry.verified = true;
        entry.verifiedUntil = verifiedUntil;
        entry.lastUpdated = new Date().toISOString();
      }
      
      console.log(`✅ Verified: ${address}`);
    } catch (error) {
      console.error(`❌ Failed to verify ${address}:`, error.message);
    }
  }
  
  saveAddressBook(addressBook);
  console.log("🎉 Verification complete!");
}

// Check verification status
async function checkVerificationStatus(mockAddressBookAddress, addresses = null) {
  const addressBook = loadAddressBook();
  const addressesToCheck = addresses || addressBook.addresses.map(entry => entry.address);
  
  if (addressesToCheck.length === 0) {
    console.log("❌ No addresses to check");
    return;
  }
  
  console.log(`🔗 Connecting to Mock Address Book: ${mockAddressBookAddress}`);
  
  const mockAddressBook = await ethers.getContractAt("MockWorldIDAddressBook", mockAddressBookAddress);
  
  console.log("🔍 Checking verification status:");
  console.log("=" .repeat(80));
  
  for (const address of addressesToCheck) {
    try {
      const verifiedUntil = await mockAddressBook.addressVerifiedUntil(address);
      const isVerified = verifiedUntil > Math.floor(Date.now() / 1000);
      
      console.log(`Address: ${address}`);
      console.log(`Status: ${isVerified ? "✅ Verified" : "❌ Not Verified"}`);
      
      if (verifiedUntil > 0) {
        const date = new Date(Number(verifiedUntil) * 1000);
        console.log(`Verified Until: ${date.toLocaleString()}`);
      }
      
      // Update local address book
      const entry = addressBook.addresses.find(
        (entry) => entry.address.toLowerCase() === address.toLowerCase()
      );
      if (entry) {
        entry.verified = isVerified;
        entry.verifiedUntil = Number(verifiedUntil);
        entry.lastUpdated = new Date().toISOString();
      }
      
      console.log("-".repeat(40));
    } catch (error) {
      console.error(`❌ Failed to check ${address}:`, error.message);
    }
  }
  
  saveAddressBook(addressBook);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case "add":
      if (args.length < 2) {
        console.log("Usage: pnpm run manage-addresses add <address> [name] [notes]");
        return;
      }
      addAddress(args[1], args[2], args[3]);
      break;
      
    case "remove":
      if (args.length < 2) {
        console.log("Usage: pnpm run manage-addresses remove <address>");
        return;
      }
      removeAddress(args[1]);
      break;
      
    case "list":
      listAddresses();
      break;
      
    case "verify":
      if (args.length < 2) {
        console.log("Usage: pnpm run manage-addresses verify <mockAddressBookAddress> [address1,address2,...]");
        return;
      }
      const addressesToVerify = args[2] ? args[2].split(",") : null;
      await verifyAddresses(args[1], addressesToVerify);
      break;
      
    case "check":
      if (args.length < 2) {
        console.log("Usage: pnpm run manage-addresses check <mockAddressBookAddress> [address1,address2,...]");
        return;
      }
      const addressesToCheck = args[2] ? args[2].split(",") : null;
      await checkVerificationStatus(args[1], addressesToCheck);
      break;
      
    default:
      console.log("Available commands:");
      console.log("  add <address> [name] [notes]     - Add address to local book");
      console.log("  remove <address>                 - Remove address from local book");
      console.log("  list                             - List all addresses");
      console.log("  verify <mockAddress> [addresses] - Verify addresses on-chain");
      console.log("  check <mockAddress> [addresses]  - Check verification status");
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
  addAddress,
  removeAddress,
  listAddresses,
  verifyAddresses,
  checkVerificationStatus,
  loadAddressBook,
  saveAddressBook,
};
