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

    /**
     * @dev Create a new election with separate contract instance
     * @param _title Election title
     * @param _description Election description
     * @param _worldIdAction Unique World ID action for this election
     * @param _candidates Array of initial candidates
     */
    function createElection(
        string memory _title,
        string memory _description,
        string memory _worldIdAction,
        Candidate[] memory _candidates
    ) external onlyRole(ELECTION_CREATOR_ROLE) returns (uint256) {
        if (_candidates.length == 0) revert NoCandidatesProvided();
        if (usedWorldIdActions[_worldIdAction]) revert WorldIdActionAlreadyUsed(_worldIdAction);
        
        electionCount++;
        uint256 newElectionId = electionCount;

        // Deploy new Election contract
        Election election = new Election(worldID, _title, _description, _worldIdAction, msg.sender);

        // Add candidates to the election
        for (uint256 i = 0; i < _candidates.length; i++) {
            election.addCandidate(_candidates[i].name, _candidates[i].description);
        }

        // Store election data
        elections[newElectionId] = ElectionInfo({
            id: newElectionId,
            title: _title,
            description: _description,
            worldIdAction: _worldIdAction,
            creator: msg.sender,
            electionAddress: address(election),
            createdAt: block.timestamp,
            active: true
        });
        
        // Mark World ID action as used
        usedWorldIdActions[_worldIdAction] = true;

        // Add to election IDs array and creator tracking
        electionIds.push(newElectionId);
        creatorElections[msg.sender].push(newElectionId);
        
        emit ElectionCreated(
            newElectionId,
            _title,
            msg.sender,
            address(election),
            _worldIdAction
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
     * @dev Grant election creator role to an address (only admin)
     */
    function grantCreatorRole(address _creator) external onlyRole(ADMIN_ROLE) {
        _grantRole(ELECTION_CREATOR_ROLE, _creator);
        emit CreatorRoleGranted(_creator, msg.sender);
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
