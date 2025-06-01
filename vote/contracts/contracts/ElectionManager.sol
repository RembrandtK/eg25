// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IWorldID} from "@worldcoin/world-id-contracts/src/interfaces/IWorldID.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Election.sol";

contract ElectionManager is AccessControl {
    IWorldID public immutable worldID;

    // Custom errors
    error NoCandidatesProvided();
    error WorldIdActionAlreadyUsed(string action);
    error ElectionNotFound(uint256 electionId);
    error UnauthorizedDeactivation();
    error ActionNotFound(string action);

    // Role definitions
    bytes32 public constant ELECTION_CREATOR_ROLE = keccak256("ELECTION_CREATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Candidate {
        string name;
        string description;
    }

    struct ElectionInfo {
        uint256 id;
        string title;
        string description;
        string worldIdAction;
        address creator;
        address electionAddress;
        uint256 createdAt;
        bool active;
    }
    
    // State variables
    uint256 public electionCount;

    // Mappings
    mapping(uint256 => ElectionInfo) public elections;
    mapping(string => bool) public usedWorldIdActions;
    mapping(address => uint256[]) public creatorElections; // Track elections by creator

    // Arrays for iteration
    uint256[] public electionIds;

    // Events
    event ElectionCreated(
        uint256 indexed electionId,
        string title,
        address indexed creator,
        address electionAddress,
        string worldIdAction
    );
    event ElectionDeactivated(uint256 indexed electionId);
    event CreatorRoleGranted(address indexed creator, address indexed admin);

    modifier electionExists(uint256 _electionId) {
        if (_electionId == 0 || _electionId > electionCount) revert ElectionNotFound(_electionId);
        _;
    }
    
    constructor(IWorldID _worldID) {
        worldID = _worldID;
        electionCount = 0;

        // Set up initial roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ELECTION_CREATOR_ROLE, msg.sender); // Deployer can create elections initially
    }

    // Universal World ID action for all elections
    string public constant UNIVERSAL_WORLD_ID_ACTION = "vote";

    /**
     * @dev Create a new election with separate contract instance
     * @param _title Election title
     * @param _description Election description
     * @param _candidates Array of initial candidates
     */
    function createElection(
        string memory _title,
        string memory _description,
        Candidate[] memory _candidates
    ) external onlyRole(ELECTION_CREATOR_ROLE) returns (uint256) {
        if (_candidates.length == 0) revert NoCandidatesProvided();

        electionCount++;
        uint256 newElectionId = electionCount;

        // Deploy new Election contract using universal action
        Election election = new Election(worldID, _title, _description, UNIVERSAL_WORLD_ID_ACTION, msg.sender);

        // Add candidates to the election
        for (uint256 i = 0; i < _candidates.length; i++) {
            election.addCandidate(_candidates[i].name, _candidates[i].description);
        }

        // Store election data
        elections[newElectionId] = ElectionInfo({
            id: newElectionId,
            title: _title,
            description: _description,
            worldIdAction: UNIVERSAL_WORLD_ID_ACTION,
            creator: msg.sender,
            electionAddress: address(election),
            createdAt: block.timestamp,
            active: true
        });

        // Note: No need to track used actions since we use universal action

        // Add to election IDs array and creator tracking
        electionIds.push(newElectionId);
        creatorElections[msg.sender].push(newElectionId);

        emit ElectionCreated(
            newElectionId,
            _title,
            msg.sender,
            address(election),
            UNIVERSAL_WORLD_ID_ACTION
        );
        
        return newElectionId;
    }
    
    function getElection(uint256 _electionId) external view electionExists(_electionId) returns (ElectionInfo memory) {
        return elections[_electionId];
    }

    function getAllElections() external view returns (ElectionInfo[] memory) {
        ElectionInfo[] memory allElections = new ElectionInfo[](electionCount);
        for (uint256 i = 0; i < electionCount; i++) {
            allElections[i] = elections[electionIds[i]];
        }
        return allElections;
    }

    function getActiveElections() external view returns (ElectionInfo[] memory) {
        // Count active elections first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < electionCount; i++) {
            if (elections[electionIds[i]].active) {
                activeCount++;
            }
        }

        // Create array of active elections
        ElectionInfo[] memory activeElections = new ElectionInfo[](activeCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < electionCount; i++) {
            if (elections[electionIds[i]].active) {
                activeElections[currentIndex] = elections[electionIds[i]];
                currentIndex++;
            }
        }

        return activeElections;
    }
    
    function getElectionCount() external view returns (uint256) {
        return electionCount;
    }
    
    /**
     * @dev Get elections created by a specific address
     */
    function getElectionsByCreator(address _creator) external view returns (ElectionInfo[] memory) {
        uint256[] memory creatorElectionIds = creatorElections[_creator];
        ElectionInfo[] memory creatorElectionInfos = new ElectionInfo[](creatorElectionIds.length);

        for (uint256 i = 0; i < creatorElectionIds.length; i++) {
            creatorElectionInfos[i] = elections[creatorElectionIds[i]];
        }

        return creatorElectionInfos;
    }

    /**
     * @dev Deactivate an election (only admin or creator)
     */
    function deactivateElection(uint256 _electionId) external electionExists(_electionId) {
        ElectionInfo storage election = elections[_electionId];
        if (!hasRole(ADMIN_ROLE, msg.sender) && election.creator != msg.sender) {
            revert UnauthorizedDeactivation();
        }

        election.active = false;
        emit ElectionDeactivated(_electionId);
    }

    /**
     * @dev Check if a World ID action is already used
     */
    function isWorldIdActionUsed(string memory _action) external view returns (bool) {
        return usedWorldIdActions[_action];
    }

    /**
     * @dev Get election by World ID action
     */
    function getElectionByAction(string memory _worldIdAction) external view returns (ElectionInfo memory) {
        for (uint256 i = 1; i <= electionCount; i++) {
            if (keccak256(abi.encodePacked(elections[i].worldIdAction)) == keccak256(abi.encodePacked(_worldIdAction))) {
                return elections[i];
            }
        }
        revert ActionNotFound(_worldIdAction);
    }

    /**
     * @dev Get election ID by election contract address
     */
    function getElectionIdByAddress(address _electionAddress) public view returns (uint256) {
        for (uint256 i = 1; i <= electionCount; i++) {
            if (elections[i].electionAddress == _electionAddress) {
                return i;
            }
        }
        revert ElectionNotFound(0);
    }

    /**
     * @dev Grant election creator role to an address (only admin)
     */
    function grantCreatorRole(address _creator) external onlyRole(ADMIN_ROLE) {
        _grantRole(ELECTION_CREATOR_ROLE, _creator);
        emit CreatorRoleGranted(_creator, msg.sender);
    }

    /**
     * @dev Vote in an election through the ElectionManager
     * @param _electionAddress The address of the election contract
     * @param signal The signal for this proof
     * @param root The root of the Merkle tree
     * @param nullifierHash The nullifier hash for this proof
     * @param proof The zero-knowledge proof
     * @param ranking Array of RankingEntry structs
     */
    function vote(
        address _electionAddress,
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        Election.RankingEntry[] memory ranking
    ) external {
        uint256 electionId = getElectionIdByAddress(_electionAddress);
        require(electionId != 0, "Election not found");

        Election electionContract = Election(_electionAddress);
        electionContract.vote(signal, root, nullifierHash, proof, ranking);
    }

    /**
     * @dev Test vote function without World ID verification
     * @param _electionAddress The address of the election contract
     * @param ranking Array of RankingEntry structs
     */
    function testVote(
        address _electionAddress,
        Election.RankingEntry[] memory ranking
    ) external {
        uint256 electionId = getElectionIdByAddress(_electionAddress);
        require(electionId != 0, "Election not found");

        Election electionContract = Election(_electionAddress);
        electionContract.testVote(ranking);
    }

    /**
     * @dev Verify World ID proof for voting (centralized verification)
     * @param _electionId The election ID to vote in
     * @param signal The vote data hash that the proof authorizes
     * @param root The root (returned by the IDKit widget)
     * @param nullifierHash The nullifier hash for this proof
     * @param proof The zero-knowledge proof
     * @return True if verification succeeds
     */
    function verifyWorldIdProof(
        uint256 _electionId,
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external view electionExists(_electionId) returns (bool) {
        // Calculate external nullifier hash using universal action
        // Using keccak256 instead of ByteHasher for simplicity
        bytes32 appIdHash = keccak256(abi.encodePacked("app_10719845a0977ef63ebe8eb9edb890ad"));
        bytes32 actionHash = keccak256(abi.encodePacked(UNIVERSAL_WORLD_ID_ACTION));
        uint256 externalNullifierHash = uint256(keccak256(abi.encodePacked(appIdHash, actionHash))) >> 8;

        // Verify the proof using World ID
        // Convert address signal to uint256 for World ID verification
        worldID.verifyProof(
            root,
            1, // groupId for Orb verification
            uint256(uint160(signal)), // Convert address to uint256
            nullifierHash,
            externalNullifierHash,
            proof
        );

        return true;
    }

    /**
     * @dev Revoke election creator role from an address (only admin)
     */
    function revokeCreatorRole(address _creator) external onlyRole(ADMIN_ROLE) {
        _revokeRole(ELECTION_CREATOR_ROLE, _creator);
    }

    /**
     * @dev Check if an address can create elections
     */
    function canCreateElections(address _address) external view returns (bool) {
        return hasRole(ELECTION_CREATOR_ROLE, _address);
    }
}
