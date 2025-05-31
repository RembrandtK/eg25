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

    // Ranking entry structure for extensible ranking data
    struct RankingEntry {
        uint256 candidateId;
        bool tiedWithPrevious;  // true if this candidate is tied with the previous entry
        // Future extensions could add:
        // uint256 confidence;     // voter's confidence level (1-10)
        // string note;           // optional voter note
        // uint256 timestamp;     // when this preference was set
    }

    // Enhanced vote tracking per user
    mapping(address => RankingEntry[]) public userRankings;  // user -> structured ranking array
    mapping(address => mapping(uint256 => uint256)) public userCandidateRanks;  // user -> candidate -> rank value

    // Pairwise comparison tallies
    mapping(uint256 => mapping(uint256 => uint256)) public pairwiseComparisons;  // candidateA -> candidateB -> count

    // User tracking
    mapping(address => bool) public hasRanking;  // user -> has submitted ranking
    address[] public rankers;

    // Events
    event RankingUpdated(address indexed user, uint256[] newRanking);
    event RankingUpdatedWithTies(address indexed user, RankingEntry[] newRanking);
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
     * @dev Update user's ranking with structured data supporting ties
     * @param newRanking Array of RankingEntry structs with tie information
     */
    function updateRankingWithTies(RankingEntry[] memory newRanking) external onlyVerifiedUser {
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

        // Remove old comparisons if user had previous ranking
        if (hasRanking[msg.sender]) {
            removeOldComparisons(msg.sender);
            clearOldRanks(msg.sender);
        }

        // Set new ranking values and store ranking array
        setNewRanksWithTies(msg.sender, newRanking);

        // Clear old ranking array and set new one
        delete userRankings[msg.sender];
        for (uint256 i = 0; i < newRanking.length; i++) {
            userRankings[msg.sender].push(newRanking[i]);
        }

        // Add new comparisons based on rank values
        addNewComparisons(msg.sender);

        // Track new ranker
        if (!hasRanking[msg.sender]) {
            hasRanking[msg.sender] = true;
            rankers.push(msg.sender);
        }

        emit RankingUpdatedWithTies(msg.sender, newRanking);
    }

    /**
     * @dev Legacy function for backward compatibility - converts simple array to RankingEntry array
     * @param newRanking Array of candidate IDs in preference order (no ties)
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

        // Convert to RankingEntry array (no ties)
        RankingEntry[] memory rankingEntries = new RankingEntry[](newRanking.length);
        for (uint256 i = 0; i < newRanking.length; i++) {
            rankingEntries[i] = RankingEntry({
                candidateId: newRanking[i],
                tiedWithPrevious: false  // No ties in legacy format
            });
        }

        // Remove old comparisons if user had previous ranking
        if (hasRanking[msg.sender]) {
            removeOldComparisons(msg.sender);
            clearOldRanks(msg.sender);
        }

        // Set new ranking values and store ranking array
        setNewRanksWithTies(msg.sender, rankingEntries);

        // Clear old ranking array and set new one
        delete userRankings[msg.sender];
        for (uint256 i = 0; i < rankingEntries.length; i++) {
            userRankings[msg.sender].push(rankingEntries[i]);
        }

        // Add new comparisons based on rank values
        addNewComparisons(msg.sender);

        // Track new ranker
        if (!hasRanking[msg.sender]) {
            hasRanking[msg.sender] = true;
            rankers.push(msg.sender);
        }

        // Emit legacy event for backward compatibility
        emit RankingUpdated(msg.sender, newRanking);
    }

    /**
     * @dev Remove user's previous comparisons from tallies
     */
    function removeOldComparisons(address user) internal {
        // Note: We don't need the old ranking array since we work with rank values directly
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
        RankingEntry[] memory oldRanking = userRankings[user];
        for (uint256 i = 0; i < oldRanking.length; i++) {
            userCandidateRanks[user][oldRanking[i].candidateId] = 0;
        }
    }

    /**
     * @dev Set new rank values for user's ranking with tie support
     * @param user The user address
     * @param newRanking Array of RankingEntry structs with tie information
     */
    function setNewRanksWithTies(address user, RankingEntry[] memory newRanking) internal {
        uint256 currentRank = MAX_RANK;

        for (uint256 i = 0; i < newRanking.length; i++) {
            // If tied with previous, use same rank as previous
            if (i > 0 && newRanking[i].tiedWithPrevious) {
                // Use the same rank as the previous candidate
                uint256 previousCandidateId = newRanking[i - 1].candidateId;
                uint256 previousRank = userCandidateRanks[user][previousCandidateId];
                userCandidateRanks[user][newRanking[i].candidateId] = previousRank;
            } else {
                // New rank tier - assign current rank and decrement for next tier
                userCandidateRanks[user][newRanking[i].candidateId] = currentRank;
                currentRank--; // Next rank tier will be lower
            }
        }
    }

    /**
     * @dev Legacy function: Set new rank values for user's ranking (no ties)
     * @param user The user address
     * @param newRanking Array of candidate IDs in preference order
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
        RankingEntry[] memory newRanking = userRankings[user];

        // Compare all pairs in the ranking
        for (uint256 i = 0; i < newRanking.length; i++) {
            for (uint256 j = 0; j < newRanking.length; j++) {
                if (i != j) {
                    uint256 candidateA = newRanking[i].candidateId;
                    uint256 candidateB = newRanking[j].candidateId;

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

    function getUserRanking(address user) external view returns (RankingEntry[] memory) {
        return userRankings[user];
    }

    function getUserRankingLegacy(address user) external view returns (uint256[] memory) {
        RankingEntry[] memory ranking = userRankings[user];
        uint256[] memory legacyRanking = new uint256[](ranking.length);

        for (uint256 i = 0; i < ranking.length; i++) {
            legacyRanking[i] = ranking[i].candidateId;
        }

        return legacyRanking;
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

    // Enhanced view functions for better data access
    function getFullComparisonMatrix() external view returns (uint256[][] memory) {
        uint256 candidateCount = electionManager.candidateCount();
        uint256[][] memory matrix = new uint256[][](candidateCount + 1);

        for (uint256 i = 0; i <= candidateCount; i++) {
            matrix[i] = new uint256[](candidateCount + 1);
            for (uint256 j = 0; j <= candidateCount; j++) {
                matrix[i][j] = pairwiseComparisons[i][j];
            }
        }
        return matrix;
    }

    /**
     * @dev DEPRECATED: This function's Condorcet calculation is fundamentally flawed.
     * The algorithm implementation is incorrect and should NOT be used for actual winner determination.
     * Condorcet winner calculation should be performed off-chain using the pairwise comparison matrix.
     * This function exists only as a reminder of the flawed approach - DO NOT USE IN PRODUCTION.
     *
     * Use getFullComparisonMatrix() instead and calculate Condorcet winner off-chain.
     */
    function getCondorcetWinner() external view returns (uint256, bool) {
        // WARNING: This implementation is WRONG - do not use!
        // The logic for determining Condorcet winners is flawed.
        // Proper Condorcet calculation requires more sophisticated algorithms
        // that handle cycles, ties, and edge cases correctly.

        // Always return no winner to prevent misuse
        return (0, false); // Calculation disabled - use off-chain analysis
    }

    /**
     * @dev NOTE: This function has limited utility in current implementation.
     * Simple pairwise win counting doesn't provide meaningful election analysis.
     * Better to use getFullComparisonMatrix() and perform sophisticated analysis off-chain.
     * Kept for backward compatibility but consider using off-chain calculations instead.
     */
    function getCandidateWinCount(uint256 candidateId) external view returns (uint256) {
        require(candidateId > 0 && candidateId <= electionManager.candidateCount(), "Invalid candidate ID");

        uint256 wins = 0;
        uint256 candidateCount = electionManager.candidateCount();

        for (uint256 opponent = 1; opponent <= candidateCount; opponent++) {
            if (candidateId != opponent) {
                if (pairwiseComparisons[candidateId][opponent] > pairwiseComparisons[opponent][candidateId]) {
                    wins++;
                }
            }
        }

        return wins;
    }

    function getRankingStats() external view returns (
        uint256 totalRankers,
        uint256 totalComparisons,
        uint256 candidateCount
    ) {
        uint256 _candidateCount = electionManager.candidateCount();
        uint256 _totalComparisons = 0;

        for (uint256 i = 1; i <= _candidateCount; i++) {
            for (uint256 j = 1; j <= _candidateCount; j++) {
                if (i != j) {
                    _totalComparisons += pairwiseComparisons[i][j];
                }
            }
        }

        return (rankers.length, _totalComparisons, _candidateCount);
    }

    function getAllRankers() external view returns (address[] memory) {
        return rankers;
    }
}
