// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IWorldIdAddressBook {
    function addressVerifiedUntil(address) external view returns (uint256);
}

interface IElectionManager {
    function candidateCount() external view returns (uint256);
    function candidates(uint256) external view returns (uint256 id, string memory name, string memory description, bool active);
}

contract PeerRanking {
    IWorldIdAddressBook public immutable worldAddressBook;
    IElectionManager public immutable electionManager;

    // Maximum rank value (first place)
    uint256 public constant MAX_RANK = type(uint256).max;

    // Efficient vote tracking per user
    mapping(address => uint256[]) public userRankings;  // user -> ordered candidate array
    mapping(address => mapping(uint256 => uint256)) public userCandidateRanks;  // user -> candidate -> rank value

    // Pairwise comparison tallies
    mapping(uint256 => mapping(uint256 => uint256)) public pairwiseComparisons;  // candidateA -> candidateB -> count

    // User tracking
    mapping(address => bool) public hasRanking;  // user -> has submitted ranking
    address[] public rankers;

    // Events
    event RankingUpdated(address indexed user, uint256[] newRanking);
    event ComparisonUpdated(uint256 indexed candidateA, uint256 indexed candidateB, uint256 newCount);

    modifier onlyVerifiedUser() {
        require(worldAddressBook.addressVerifiedUntil(msg.sender) > 0, "Address not verified");
        _;
    }

    constructor(IWorldIdAddressBook _worldAddressBook, IElectionManager _electionManager) {
        worldAddressBook = _worldAddressBook;
        electionManager = _electionManager;
    }

    /**
     * @dev Update user's ranking and recalculate pairwise comparisons
     * @param newRanking Array of candidate IDs in preference order (ties allowed by position)
     */
    function updateRanking(uint256[] memory newRanking) external onlyVerifiedUser {
        require(newRanking.length > 0, "Ranking cannot be empty");

        // Validate all candidate IDs
        uint256 candidateCount = electionManager.candidateCount();
        for (uint256 i = 0; i < newRanking.length; i++) {
            require(newRanking[i] > 0 && newRanking[i] <= candidateCount, "Invalid candidate ID");

            // Check candidate is active
            (, , , bool active) = electionManager.candidates(newRanking[i]);
            require(active, "Candidate is not active");
        }

        // Remove old comparisons if user had previous ranking
        if (hasRanking[msg.sender]) {
            removeOldComparisons(msg.sender);
            clearOldRanks(msg.sender);
        }

        // Set new ranking values and store ranking array
        setNewRanks(msg.sender, newRanking);
        userRankings[msg.sender] = newRanking;

        // Add new comparisons based on rank values
        addNewComparisons(msg.sender);

        // Track new ranker
        if (!hasRanking[msg.sender]) {
            hasRanking[msg.sender] = true;
            rankers.push(msg.sender);
        }

        emit RankingUpdated(msg.sender, newRanking);
    }

    /**
     * @dev Remove user's previous comparisons from tallies
     */
    function removeOldComparisons(address user) internal {
        uint256[] memory oldRanking = userRankings[user];
        uint256 candidateCount = electionManager.candidateCount();

        // Check all candidate pairs and remove comparisons where this user had a preference
        for (uint256 candidateA = 1; candidateA <= candidateCount; candidateA++) {
            for (uint256 candidateB = 1; candidateB <= candidateCount; candidateB++) {
                if (candidateA != candidateB) {
                    uint256 rankA = userCandidateRanks[user][candidateA];
                    uint256 rankB = userCandidateRanks[user][candidateB];

                    // If user had a preference (A ranked higher than B)
                    if (rankA > 0 && rankB > 0 && rankA > rankB) {
                        pairwiseComparisons[candidateA][candidateB]--;
                        emit ComparisonUpdated(candidateA, candidateB, pairwiseComparisons[candidateA][candidateB]);
                    }
                }
            }
        }
    }

    /**
     * @dev Clear user's old rank values
     */
    function clearOldRanks(address user) internal {
        uint256[] memory oldRanking = userRankings[user];
        for (uint256 i = 0; i < oldRanking.length; i++) {
            userCandidateRanks[user][oldRanking[i]] = 0;
        }
    }

    /**
     * @dev Set new rank values for user's ranking
     * For now, treats array position as rank (no ties in array representation)
     * Ties will be handled by frontend sending candidates in same "tier"
     */
    function setNewRanks(address user, uint256[] memory newRanking) internal {
        uint256 currentRank = MAX_RANK;

        // Simple approach: each position gets decreasing rank value
        for (uint256 i = 0; i < newRanking.length; i++) {
            userCandidateRanks[user][newRanking[i]] = currentRank - i;
        }
    }

    /**
     * @dev Add new comparisons based on rank values
     */
    function addNewComparisons(address user) internal {
        uint256[] memory newRanking = userRankings[user];

        // Compare all pairs in the ranking
        for (uint256 i = 0; i < newRanking.length; i++) {
            for (uint256 j = 0; j < newRanking.length; j++) {
                if (i != j) {
                    uint256 candidateA = newRanking[i];
                    uint256 candidateB = newRanking[j];

                    uint256 rankA = userCandidateRanks[user][candidateA];
                    uint256 rankB = userCandidateRanks[user][candidateB];

                    // If A is ranked higher than B (higher rank value)
                    if (rankA > rankB) {
                        pairwiseComparisons[candidateA][candidateB]++;
                        emit ComparisonUpdated(candidateA, candidateB, pairwiseComparisons[candidateA][candidateB]);
                    }
                }
            }
        }
    }

    // View functions
    function getComparisonCount(uint256 candidateA, uint256 candidateB) external view returns (uint256) {
        return pairwiseComparisons[candidateA][candidateB];
    }

    function getUserRanking(address user) external view returns (uint256[] memory) {
        return userRankings[user];
    }

    function getUserCandidateRank(address user, uint256 candidateId) external view returns (uint256) {
        return userCandidateRanks[user][candidateId];
    }

    function getUserPreference(address user, uint256 candidateA, uint256 candidateB) external view returns (int8) {
        uint256 rankA = userCandidateRanks[user][candidateA];
        uint256 rankB = userCandidateRanks[user][candidateB];

        if (rankA == 0 && rankB == 0) return 0;  // Neither ranked
        if (rankA == 0) return -1;  // Only B ranked
        if (rankB == 0) return 1;   // Only A ranked
        if (rankA > rankB) return 1;   // A preferred
        if (rankB > rankA) return -1;  // B preferred
        return 0;  // Tied
    }

    function getTotalRankers() external view returns (uint256) {
        return rankers.length;
    }
}
