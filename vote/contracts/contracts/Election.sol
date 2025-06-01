// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IWorldID} from "@worldcoin/world-id-contracts/src/interfaces/IWorldID.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

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

// Interface for ElectionManager
interface IElectionManager {
    function verifyWorldIdProof(
        uint256 _electionId,
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external view returns (bool);

    function getElectionIdByAddress(address _electionAddress) external view returns (uint256);
}

contract Election is IElection, AccessControl, Pausable {
    using ByteHasher for bytes;

    IWorldID public immutable worldId;
    IElectionManager public immutable electionManager;

    // Custom errors
    error InvalidCandidateId(uint256 candidateId);
    error VoterNotFound(uint256 voterId);


    // Role definitions
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    bytes32 public constant CANDIDATE_MANAGER_ROLE = keccak256("CANDIDATE_MANAGER_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    // Note: DEFAULT_ADMIN_ROLE is inherited from AccessControl for granting/revoking roles

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
    uint256 public candidateCount;
    uint256 public createdAt;

    // Selection state
    uint256 public selectionBlock;  // Block number used for selection calculation (0 = not completed)
    uint256[] public selectedCandidates;  // Array of selected candidate IDs (empty = not completed)
    
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
    event SelectionCompleted(uint256[] selectedCandidates, uint256 selectionBlock);



    constructor(
        IWorldID _worldId,
        string memory _title,
        string memory _description,
        string memory _worldIdAction,
        address _creator
    ) {
        worldId = _worldId;
        electionManager = IElectionManager(msg.sender); // ElectionManager is deploying this contract
        title = _title;
        description = _description;
        worldIdAction = _worldIdAction;
        creator = _creator;
        factory = msg.sender; // The factory is deploying this contract
        candidateCount = 0;
        createdAt = block.timestamp;

        // Calculate external nullifier hash from app ID and action
        // Using the configured app ID from environment
        externalNullifierHash = abi
            .encodePacked(abi.encodePacked("app_10719845a0977ef63ebe8eb9edb890ad").hashToField(), _worldIdAction)
            .hashToField();

        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _creator); // Admin can grant/revoke all roles
        _grantRole(FACTORY_ROLE, msg.sender); // Factory can add candidates during creation
        _grantRole(CANDIDATE_MANAGER_ROLE, _creator); // Creator can manage candidates
        _grantRole(REPORTER_ROLE, _creator); // Creator can report selection results
        _grantRole(OPERATOR_ROLE, _creator); // Creator can manage lifecycle and pausing
    }
    
    // Add a candidate (factory role during creation)
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

    // Deactivate a candidate (candidate manager role)
    function deactivateCandidate(uint256 candidateId) external onlyRole(CANDIDATE_MANAGER_ROLE) {
        if (candidateId == 0 || candidateId > candidateCount) {
            revert InvalidCandidateId(candidateId);
        }
        candidates[candidateId].active = false;
    }

    // Reactivate a candidate (candidate manager role)
    function reactivateCandidate(uint256 candidateId) external onlyRole(CANDIDATE_MANAGER_ROLE) {
        if (candidateId == 0 || candidateId > candidateCount) {
            revert InvalidCandidateId(candidateId);
        }
        candidates[candidateId].active = true;
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
     * @dev Test vote function without World ID for debugging
     * @param ranking Array of RankingEntry structs with tie information
     */
    function testVote(
        RankingEntry[] memory ranking
    ) external whenNotPaused {
        // Minimal validation - allow empty rankings and any candidate IDs
        for (uint256 i = 0; i < ranking.length; i++) {
            if (ranking[i].candidateId > candidateCount) {
                revert InvalidCandidateId(ranking[i].candidateId);
            }
        }

        // Use msg.sender as voter ID for testing
        uint256 testVoterId = uint256(uint160(msg.sender));

        // Store/update ranking by test voter ID
        bool isNewVoter = votes[testVoterId].length == 0;

        delete votes[testVoterId];
        for (uint256 i = 0; i < ranking.length; i++) {
            votes[testVoterId].push(ranking[i]);
        }

        // Track new voter
        if (isNewVoter) {
            voters.push(testVoterId);
        }

        emit RankingUpdated(msg.sender, ranking);
    }

    function vote(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        RankingEntry[] memory ranking
    ) external whenNotPaused {
        // We verify the provided proof is valid and the user is verified by World ID
        // Note: We allow vote updates, so we don't check if voter ID was used before
        // Get our election ID from ElectionManager and verify through it
        uint256 electionId = electionManager.getElectionIdByAddress(address(this));
        electionManager.verifyWorldIdProof(
            electionId,
            signal,
            root,
            nullifierHash,
            proof
        );

        // Minimal validation - allow empty rankings and any candidate IDs
        // Only validate that candidate IDs are within reasonable bounds if provided
        for (uint256 i = 0; i < ranking.length; i++) {
            // Allow candidate ID 0 (abstention) and any ID up to candidateCount
            if (ranking[i].candidateId > candidateCount) {
                revert InvalidCandidateId(ranking[i].candidateId);
            }
        }

        // Store/update ranking by nullifier hash (allows vote updates)
        bool isNewVoter = votes[nullifierHash].length == 0;

        delete votes[nullifierHash];
        for (uint256 i = 0; i < ranking.length; i++) {
            votes[nullifierHash].push(ranking[i]);
        }

        // Track new voter
        if (isNewVoter) {
            voters.push(nullifierHash);
        }

        emit RankingUpdated(msg.sender, ranking);
    }

    // Get vote for a specific voter ID
    function getVote(uint256 voterId) external view returns (RankingEntry[] memory) {
        return votes[voterId];
    }

    // Pause voting (emergency stop - operator role)
    function pauseVoting() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }

    // Resume voting (operator role)
    function resumeVoting() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }

    // Get total number of votes cast
    function getVoteCount() external view returns (uint256) {
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
        uint256 _voteCount
    ) {
        return (
            title,
            description,
            worldIdAction,
            creator,
            createdAt,
            !paused(),
            candidateCount,
            voters.length
        );
    }



    // Report selection results (reporter role)
    function reportSelection(uint256[] memory _selectedCandidates) external onlyRole(REPORTER_ROLE) {
        // Use the last complete block for deterministic results
        // This ensures all nodes will use the same block for calculations
        selectionBlock = block.number - 1;  // Previous block is guaranteed to be complete

        // Store selected candidates (currently expecting single winner, but array for future)
        // Allow updates - clear previous selection and set new one
        delete selectedCandidates;
        for (uint256 i = 0; i < _selectedCandidates.length; i++) {
            selectedCandidates.push(_selectedCandidates[i]);
        }

        emit SelectionCompleted(_selectedCandidates, selectionBlock);
    }

    // Get selection results
    function getSelectionResults() external view returns (
        uint256[] memory _selectedCandidates,
        uint256 _selectionBlock
    ) {
        return (
            selectedCandidates,
            selectionBlock
        );
    }

    // Get the block number that should be used for selection calculations
    function getSelectionBlock() external view returns (uint256) {
        if (selectionBlock != 0) {
            return selectionBlock;
        } else {
            // Return what would be used if selection was completed now
            return block.number - 1;
        }
    }



    // Get comprehensive election status
    function getElectionStatus() external view returns (
        bool _votingActive,
        uint256 _voteCount,
        uint256 _candidateCount,
        uint256 _selectionBlock,
        uint256[] memory _selectedCandidates
    ) {
        return (
            !paused(),
            voters.length,
            candidateCount,
            selectionBlock,
            selectedCandidates
        );
    }
}
