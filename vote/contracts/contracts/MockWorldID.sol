// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title MockWorldID
 * @dev Mock implementation of World ID Router for fast testing
 * @notice This is ONLY for testing - never use in production!
 */
contract MockWorldID {
    /// @dev Whether to simulate proof verification failure
    bool public shouldRevert = false;
    
    /// @dev Custom revert message for testing
    string public revertMessage = "Mock verification failed";

    /**
     * @dev Mock implementation of verifyProof that always succeeds (unless configured to fail)
     * @notice In real World ID, this performs ZK proof verification
     */
    function verifyProof(
        uint256, // root
        uint256, // groupId
        uint256, // signalHash
        uint256, // nullifierHash
        uint256, // externalNullifierHash
        uint256[8] calldata // proof
    ) external view {
        if (shouldRevert) {
            revert(revertMessage);
        }
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
}
