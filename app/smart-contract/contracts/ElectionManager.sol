// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IWorldIdAddressBook {
    function addressVerifiedUntil(address) external view returns (uint256);
}

contract ElectionManager {
    IWorldIdAddressBook public immutable worldAddressBook;
    
    struct Candidate {
        uint256 id;
        string name;
        string description;
        bool active;
    }
    
    struct Vote {
        address voter;
        uint256[] rankedCandidateIds; // Array of candidate IDs in order of preference
        uint256 timestamp;
    }
    
    // State variables
    address public owner;
    bool public votingActive;
    uint256 public candidateCount;
    
    // Mappings
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;
    mapping(address => Vote) public votes;
    
    // Arrays for easy iteration
    uint256[] public candidateIds;
    address[] public voters;
    
    // Events
    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoteCast(address indexed voter, uint256[] rankedCandidateIds);
    event VotingStatusChanged(bool active);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyVerifiedUser() {
        require(worldAddressBook.addressVerifiedUntil(msg.sender) > 0, "Address not verified");
        _;
    }
    
    modifier votingIsActive() {
        require(votingActive, "Voting is not active");
        _;
    }
    
    constructor(IWorldIdAddressBook _worldAddressBook) {
        worldAddressBook = _worldAddressBook;
        owner = msg.sender;
        votingActive = true; // Start with voting active
        candidateCount = 0;
    }
    
    // Add a candidate (only owner)
    function addCandidate(string memory _name, string memory _description) external onlyOwner {
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
    
    // Cast a ranked vote
    function vote(uint256[] memory _rankedCandidateIds) external onlyVerifiedUser votingIsActive {
        require(!hasVoted[msg.sender], "You have already voted");
        require(_rankedCandidateIds.length > 0, "Must vote for at least one candidate");
        
        // Validate all candidate IDs exist and are active
        for (uint256 i = 0; i < _rankedCandidateIds.length; i++) {
            require(_rankedCandidateIds[i] > 0 && _rankedCandidateIds[i] <= candidateCount, "Invalid candidate ID");
            require(candidates[_rankedCandidateIds[i]].active, "Candidate is not active");
        }
        
        // Store the vote
        votes[msg.sender] = Vote({
            voter: msg.sender,
            rankedCandidateIds: _rankedCandidateIds,
            timestamp: block.timestamp
        });
        
        hasVoted[msg.sender] = true;
        voters.push(msg.sender);
        
        emit VoteCast(msg.sender, _rankedCandidateIds);
    }
    
    // Get vote for a specific voter
    function getVote(address _voter) external view returns (uint256[] memory) {
        // TODO: I think this can/should be removed, and tests updated (first). Default value for uint256[] is empty array which should work.
        require(hasVoted[_voter], "Voter has not voted");
        return votes[_voter].rankedCandidateIds;
    }
    
    // Toggle voting status (only owner)
    function toggleVoting() external onlyOwner {
        votingActive = !votingActive;
        emit VotingStatusChanged(votingActive);
    }
    
    // Get total number of votes cast
    function getTotalVotes() external view returns (uint256) {
        return voters.length;
    }
    
    // Check if an address has voted
    function checkHasVoted(address _voter) external view returns (bool) {
        return hasVoted[_voter];
    }
}
