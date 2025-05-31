// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IWorldIdAddressBook {
    function addressVerifiedUntil(address) external view returns (uint256);
}

interface IElectionManager {
    function candidateCount() external view returns (uint256);
    function candidates(uint256) external view returns (uint256 id, string memory name, string memory description, bool active);
}

contract SimpleRanking {
    IWorldIdAddressBook public immutable worldAddressBook;
    IElectionManager public immutable electionManager;

    // Ranking entry structure for extensible ranking data
    struct RankingEntry {
        uint256 candidateId;
        bool tiedWithPrevious;  // true if this candidate is tied with the previous entry
        // Future extensions could add:
        // uint256 confidence;     // voter's confidence level (1-10)
        // string note;           // optional voter note
        // uint256 timestamp;     // when this preference was set
    }

    // Simple vote tracking per user
    mapping(address => RankingEntry[]) public userRankings;  // user -> structured ranking array
    mapping(address => bool) public hasRanking;  // user -> has submitted ranking
    mapping(address => uint256) public rankingTimestamp;  // user -> when they last voted
    
    // User tracking
    address[] public rankers;

    // Events
    event RankingUpdated(address indexed user, RankingEntry[] newRanking, uint256 timestamp);

    modifier onlyVerifiedUser() {
        require(worldAddressBook.addressVerifiedUntil(msg.sender) > 0, "Address not verified");
        _;
    }

    constructor(IWorldIdAddressBook _worldAddressBook, IElectionManager _electionManager) {
        worldAddressBook = _worldAddressBook;
        electionManager = _electionManager;
    }

    /**
     * @dev Update user's ranking with structured data supporting ties
     * @param newRanking Array of RankingEntry structs with tie information
     */
    function updateRanking(RankingEntry[] memory newRanking) external onlyVerifiedUser {
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

        // Clear old ranking array and set new one
        delete userRankings[msg.sender];
        for (uint256 i = 0; i < newRanking.length; i++) {
            userRankings[msg.sender].push(newRanking[i]);
        }

        // Update timestamp
        rankingTimestamp[msg.sender] = block.timestamp;

        // Track new ranker
        if (!hasRanking[msg.sender]) {
            hasRanking[msg.sender] = true;
            rankers.push(msg.sender);
        }

        emit RankingUpdated(msg.sender, newRanking, block.timestamp);
    }

    // View functions
    function getUserRanking(address user) external view returns (RankingEntry[] memory) {
        return userRankings[user];
    }

    function getUserRankingWithTimestamp(address user) external view returns (RankingEntry[] memory, uint256) {
        return (userRankings[user], rankingTimestamp[user]);
    }

    function getTotalRankers() external view returns (uint256) {
        return rankers.length;
    }

    function getAllRankers() external view returns (address[] memory) {
        return rankers;
    }

    function getRankingStats() external view returns (
        uint256 totalRankers,
        uint256 candidateCount
    ) {
        return (rankers.length, electionManager.candidateCount());
    }

    /**
     * @dev Get all rankings for off-chain analysis
     * Returns arrays of rankers and their corresponding rankings
     */
    function getAllRankings() external view returns (
        address[] memory voters,
        RankingEntry[][] memory rankings,
        uint256[] memory timestamps
    ) {
        uint256 totalRankers = rankers.length;
        
        voters = new address[](totalRankers);
        rankings = new RankingEntry[][](totalRankers);
        timestamps = new uint256[](totalRankers);
        
        for (uint256 i = 0; i < totalRankers; i++) {
            address voter = rankers[i];
            voters[i] = voter;
            rankings[i] = userRankings[voter];
            timestamps[i] = rankingTimestamp[voter];
        }
        
        return (voters, rankings, timestamps);
    }

    /**
     * @dev Get rankings in batches for large datasets
     * @param offset Starting index
     * @param limit Maximum number of rankings to return
     */
    function getRankingsBatch(uint256 offset, uint256 limit) external view returns (
        address[] memory voters,
        RankingEntry[][] memory rankings,
        uint256[] memory timestamps,
        uint256 totalCount
    ) {
        uint256 totalRankers = rankers.length;
        require(offset < totalRankers, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > totalRankers) {
            end = totalRankers;
        }
        
        uint256 batchSize = end - offset;
        voters = new address[](batchSize);
        rankings = new RankingEntry[][](batchSize);
        timestamps = new uint256[](batchSize);
        
        for (uint256 i = 0; i < batchSize; i++) {
            address voter = rankers[offset + i];
            voters[i] = voter;
            rankings[i] = userRankings[voter];
            timestamps[i] = rankingTimestamp[voter];
        }
        
        return (voters, rankings, timestamps, totalRankers);
    }

    /**
     * @dev Check if a user has submitted a ranking
     */
    function hasUserVoted(address user) external view returns (bool) {
        return hasRanking[user];
    }

    /**
     * @dev Get the timestamp when a user last voted
     */
    function getUserVoteTimestamp(address user) external view returns (uint256) {
        return rankingTimestamp[user];
    }
}
