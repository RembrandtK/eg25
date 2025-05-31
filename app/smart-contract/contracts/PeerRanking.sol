// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IWorldID} from "@worldcoin/world-id-contracts/src/interfaces/IWorldID.sol";
import {IElectionManager} from "./ElectionManager.sol";

library ByteHasher {
    /// @dev Creates a keccak256 hash of a bytestring.
    /// @param value The bytestring to hash
    /// @return The hash of the specified value
    /// @dev `>> 8` makes sure that the result is included in our field
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}

contract PeerRanking {
    using ByteHasher for bytes;

    /// @notice Thrown when attempting to reuse a nullifier
    error InvalidNullifier();

    /// @dev The address of the World ID Router contract that will be used for verifying proofs
    IWorldID public immutable worldId;

    /// @dev The keccak256 hash of the externalNullifier (unique identifier of the action performed), combination of appId and action
    uint256 public immutable externalNullifierHash;

    /// @dev The World ID group ID (1 for Orb-verified)
    uint256 public immutable groupId = 1;

    /// @dev Whether a nullifier hash has been used already. Used to guarantee an action is only performed once by a single person
    mapping(uint256 => bool) internal nullifierHashes;

    IElectionManager public immutable electionManager;

    // Maximum rank value (first place)
    uint256 public constant MAX_RANK = type(uint256).max;

    // Ranking entry structure for extensible ranking data
    struct RankingEntry {
        uint256 candidateId;
        bool tiedWithPrevious;  // true if this candidate is tied with the previous entry
        // Future extensions could add:
        // uint256 confidence;     // voter's confidence level (1-10)
        // string note;           // optional voter note
        // uint256 timestamp;     // when this preference was set
    }

    // Simple vote tracking per nullifier (anonymous but unique per human per app)
    mapping(uint256 => RankingEntry[]) public nullifierRankings;  // nullifier -> structured ranking array
    uint256[] public rankers;  // list of nullifiers that have voted

    // Events
    event RankingUpdated(address indexed user, RankingEntry[] newRanking);

    /// @param _worldId The address of the WorldIDRouter that will verify the proofs
    /// @param _appId The World ID App ID (from Developer Portal)
    /// @param _action The World ID Action (from Developer Portal)
    /// @param _electionManager The election manager contract
    constructor(
        IWorldID _worldId,
        string memory _appId,
        string memory _action,
        IElectionManager _electionManager
    ) {
        worldId = _worldId;
        electionManager = _electionManager;
        externalNullifierHash = abi
            .encodePacked(abi.encodePacked(_appId).hashToField(), _action)
            .hashToField();
    }

    /**
     * @dev Update user's ranking with World ID ZK proof verification
     * @param signal The user's wallet address (cannot be tampered with)
     * @param root The root (returned by the IDKit widget)
     * @param nullifierHash The nullifier hash for this proof, preventing double signaling (returned by the IDKit widget)
     * @param proof The zero-knowledge proof that demonstrates the claimer is registered with World ID (returned by the IDKit widget)
     * @param newRanking Array of RankingEntry structs with tie information
     */
    function updateRanking(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        RankingEntry[] memory newRanking
    ) external {
        // First, we make sure this person hasn't done this before
        if (nullifierHashes[nullifierHash]) revert InvalidNullifier();

        // We now verify the provided proof is valid and the user is verified by World ID
        worldId.verifyProof(
            root,
            groupId, // set to "1" in the constructor
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifierHash,
            proof
        );

        // We now record the user has done this, so they can't do it again (sybil-resistance)
        nullifierHashes[nullifierHash] = true;
        require(newRanking.length > 0, "Ranking cannot be empty");

        // Validate all candidate IDs and tie logic
        uint256 candidateCount = electionManager.candidateCount();
        for (uint256 i = 0; i < newRanking.length; i++) {
            require(newRanking[i].candidateId > 0 && newRanking[i].candidateId <= candidateCount, "Invalid candidate ID");

            // Check candidate is active
            (, , , bool active) = electionManager.candidates(newRanking[i].candidateId);
            require(active, "Candidate is not active");

            // First entry cannot be tied with previous
            if (i == 0) {
                require(!newRanking[i].tiedWithPrevious, "First entry cannot be tied with previous");
            }
        }

        // Store/update ranking by nullifier (allows vote updates)
        bool isNewRanker = nullifierRankings[nullifierHash].length == 0;

        delete nullifierRankings[nullifierHash];
        for (uint256 i = 0; i < newRanking.length; i++) {
            nullifierRankings[nullifierHash].push(newRanking[i]);
        }

        // Track new ranker
        if (isNewRanker) {
            rankers.push(nullifierHash);
        }

        emit RankingUpdated(msg.sender, newRanking);
    }



    // Simple view functions
    function getNullifierRanking(uint256 nullifierHash) external view returns (RankingEntry[] memory) {
        return nullifierRankings[nullifierHash];
    }

    // Simple view functions
    function getTotalRankers() external view returns (uint256) {
        return rankers.length;
    }

    function getAllRankers() external view returns (uint256[] memory) {
        return rankers;
    }

    function getRankingStats() external view returns (
        uint256 totalRankers,
        uint256 totalComparisons,
        uint256 candidateCount
    ) {
        return (rankers.length, 0, electionManager.candidateCount());
    }
}
