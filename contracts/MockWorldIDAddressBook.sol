// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IWorldID} from "@worldcoin/world-id-contracts/src/interfaces/IWorldID.sol";

/**
 * @title MockWorldIDAddressBook
 * @dev Mock implementation of World ID Address Book for testing
 * @notice This is ONLY for testing - never use in production!
 */
contract MockWorldIDAddressBook is IWorldID {
    /// @dev Whether to simulate proof verification failure
    bool public shouldRevert = false;
    
    /// @dev Custom revert message for testing
    string public revertMessage = "Mock verification failed";
    
    /// @dev Track verified addresses for testing
    mapping(address => uint256) public verifiedUntil;
    
    /// @dev Track used nullifier hashes to prevent double verification
    mapping(uint256 => bool) public usedNullifiers;

    /**
     * @dev Mock implementation of verifyProof that always succeeds (unless configured to fail)
     * @notice In real World ID, this performs ZK proof verification
     */
    function verifyProof(
        uint256, // root
        uint256, // groupId  
        uint256, // signalHash
        uint256 nullifierHash,
        uint256, // externalNullifierHash
        uint256[8] calldata // proof
    ) external override {
        if (shouldRevert) {
            revert(revertMessage);
        }
        
        // Check if nullifier hash has been used (prevent double verification)
        require(!usedNullifiers[nullifierHash], "Nullifier already used");
        
        // Mark nullifier as used
        usedNullifiers[nullifierHash] = true;
        
        // If not configured to revert, verification "succeeds"
    }

    /**
     * @dev Configure mock to simulate verification failure
     * @param _shouldRevert Whether to revert on verification
     * @param _message Custom revert message
     */
    function setVerificationFailure(bool _shouldRevert, string memory _message) external {
        shouldRevert = _shouldRevert;
        revertMessage = _message;
    }

    /**
     * @dev Reset mock to always succeed
     */
    function reset() external {
        shouldRevert = false;
        revertMessage = "Mock verification failed";
    }
    
    /**
     * @dev Set an address as verified until a certain timestamp (for testing)
     * @param addr Address to verify
     * @param until Timestamp until which the address is verified
     */
    function setAddressVerifiedUntil(address addr, uint256 until) external {
        verifiedUntil[addr] = until;
    }
    
    /**
     * @dev Check if an address is verified
     * @param addr Address to check
     * @return bool Whether the address is currently verified
     */
    function isVerified(address addr) external view returns (bool) {
        return verifiedUntil[addr] > block.timestamp;
    }
    
    /**
     * @dev Check if a nullifier hash has been used
     * @param nullifierHash The nullifier hash to check
     * @return bool Whether the nullifier has been used
     */
    function isNullifierUsed(uint256 nullifierHash) external view returns (bool) {
        return usedNullifiers[nullifierHash];
    }
}
