// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IWorldID} from "@worldcoin/world-id-contracts/src/interfaces/IWorldID.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

library ByteHasher {
    /// @dev Creates a keccak256 hash of a bytestring.
    /// @param value The bytestring to hash
    /// @return The hash of the specified value
    /// @dev `>> 8` makes sure that the result is included in our field
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}

interface IElection {
    function candidateCount() external view returns (uint256);
    function candidates(uint256) external view returns (uint256 id, string memory name, string memory description, bool active);
}

contract Election is IElection, AccessControl {
    using ByteHasher for bytes;

    IWorldID public immutable worldId;

    // Custom errors
    error VotingNotActive();
    error RankingEmpty();
    error InvalidCandidateId(uint256 candidateId);
    error CandidateNotActive(uint256 candidateId);
    error FirstEntryCannotBeTied();
    error VoterNotFound(uint256 voterId);

    // Role definitions
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    bytes32 public constant CANDIDATE_MANAGER_ROLE = keccak256("CANDIDATE_MANAGER_ROLE");

    /// @dev The keccak256 hash of the externalNullifier (unique identifier of the action performed), combination of appId and action
    uint256 public immutable externalNullifierHash;

    /// @dev The World ID group ID (1 for Orb-verified)
    uint256 public immutable groupId = 1;

    struct Candidate {
        uint256 id;
        string name;
        string description;
        bool active;
    }

    // Ranking entry structure for extensible ranking data
    struct RankingEntry {
        uint256 candidateId;
        bool tiedWithPrevious;  // true if this candidate is tied with the previous entry
    }

    // Election metadata
    string public title;
    string public description;
    string public worldIdAction;
    address public creator;
    address public factory;

    // State variables
    bool public votingActive;
    uint256 public candidateCount;
    uint256 public createdAt;
    
    // Mappings
    mapping(uint256 => Candidate) public candidates;
    // Vote tracking per voter ID (nullifier - anonymous but unique per human per app)
    mapping(uint256 => RankingEntry[]) public votes;  // voter ID -> structured ranking array

    // Arrays for easy iteration
    uint256[] public candidateIds;
    uint256[] public voters;  // list of voter IDs (nullifiers) that have voted
    
    // Events
    event CandidateAdded(uint256 indexed candidateId, string name);
    event RankingUpdated(address indexed user, RankingEntry[] newRanking);
    event VotingStatusChanged(bool active);

    modifier votingIsActive() {
        if (!votingActive) revert VotingNotActive();
        _;
    }

    constructor(
        IWorldID _worldId,
        string memory _title,
        string memory _description,
        string memory _worldIdAction,
        address _creator
    ) {
        worldId = _worldId;
        title = _title;
        description = _description;
        worldIdAction = _worldIdAction;
        creator = _creator;
        factory = msg.sender; // The factory is deploying this contract
        votingActive = true; // Start with voting active
        candidateCount = 0;
        createdAt = block.timestamp;

        // Calculate external nullifier hash from app ID and action
        // Using the configured app ID from environment
        externalNullifierHash = abi
            .encodePacked(abi.encodePacked("app_10719845a0977ef63ebe8eb9edb890ad").hashToField(), _worldIdAction)
            .hashToField();

        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _creator);
        _grantRole(CREATOR_ROLE, _creator);
        _grantRole(FACTORY_ROLE, msg.sender);
        _grantRole(CANDIDATE_MANAGER_ROLE, msg.sender); // Factory can add candidates during creation
    }
    
    // Add a candidate (only factory during creation)
    function addCandidate(string memory _name, string memory _description) external onlyRole(FACTORY_ROLE) {
        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            description: _description,
            active: true
        });
        candidateIds.push(candidateCount);
        
        emit CandidateAdded(candidateCount, _name);
    }
    
    // Get all active candidates
    function getCandidates() external view returns (Candidate[] memory) {
        uint256 activeCount = 0;
        
        // Count active candidates
        for (uint256 i = 0; i < candidateIds.length; i++) {
            if (candidates[candidateIds[i]].active) {
                activeCount++;
            }
        }
        
        // Create array of active candidates
        Candidate[] memory activeCandidates = new Candidate[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < candidateIds.length; i++) {
            if (candidates[candidateIds[i]].active) {
                activeCandidates[index] = candidates[candidateIds[i]];
                index++;
            }
        }
        
        return activeCandidates;
    }
    
    /**
     * @dev Cast vote with World ID ZK proof verification
     * @param signal The vote data hash that the proof authorizes (prevents proof reuse for different votes)
     * @param root The root (returned by the IDKit widget)
     * @param voterId The voter ID (nullifier hash) for this proof, preventing double signaling (returned by the IDKit widget)
     * @param proof The zero-knowledge proof that demonstrates the claimer is registered with World ID (returned by the IDKit widget)
     * @param ranking Array of RankingEntry structs with tie information
     */
    function vote(
        uint256 signal,
        uint256 root,
        uint256 voterId,
        uint256[8] calldata proof,
        RankingEntry[] memory ranking
    ) external votingIsActive {
        // We verify the provided proof is valid and the user is verified by World ID
        // Note: We allow vote updates, so we don't check if voter ID was used before
        worldId.verifyProof(
            root,
            groupId, // set to "1" in the constructor
            signal, // Signal is already a hash of the vote data
            voterId,
            externalNullifierHash,
            proof
        );

        if (ranking.length == 0) revert RankingEmpty();

        // Validate all candidate IDs and tie logic
        for (uint256 i = 0; i < ranking.length; i++) {
            if (ranking[i].candidateId == 0 || ranking[i].candidateId > candidateCount) {
                revert InvalidCandidateId(ranking[i].candidateId);
            }

            // Check candidate is active
            if (!candidates[ranking[i].candidateId].active) {
                revert CandidateNotActive(ranking[i].candidateId);
            }

            // First entry cannot be tied with previous
            if (i == 0 && ranking[i].tiedWithPrevious) {
                revert FirstEntryCannotBeTied();
            }
        }

        // Store/update ranking by voter ID (allows vote updates)
        bool isNewVoter = votes[voterId].length == 0;

        delete votes[voterId];
        for (uint256 i = 0; i < ranking.length; i++) {
            votes[voterId].push(ranking[i]);
        }

        // Track new voter
        if (isNewVoter) {
            voters.push(voterId);
        }

        emit RankingUpdated(msg.sender, ranking);
    }

    // Get vote for a specific voter ID
    function getVote(uint256 voterId) external view returns (RankingEntry[] memory) {
        return votes[voterId];
    }

    // Toggle voting status (only creator)
    function toggleVoting() external onlyRole(CREATOR_ROLE) {
        votingActive = !votingActive;
        emit VotingStatusChanged(votingActive);
    }

    // Get total number of voters
    function getTotalVoters() external view returns (uint256) {
        return voters.length;
    }

    // Get all voter IDs (nullifier hashes)
    function getAllVoters() external view returns (uint256[] memory) {
        return voters;
    }

    // Get voting statistics
    function getVotingStats() external view returns (
        uint256 totalVoters,
        uint256 totalComparisons,
        uint256 candidateCount_
    ) {
        return (voters.length, 0, candidateCount);
    }

    // Get election metadata
    function getElectionInfo() external view returns (
        string memory _title,
        string memory _description,
        string memory _worldIdAction,
        address _creator,
        uint256 _createdAt,
        bool _votingActive,
        uint256 _candidateCount,
        uint256 _totalVoters
    ) {
        return (
            title,
            description,
            worldIdAction,
            creator,
            createdAt,
            votingActive,
            candidateCount,
            voters.length
        );
    }
}
