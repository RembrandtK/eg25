// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "contracts/Election.sol";
import "contracts/ElectionManager.sol";
import "contracts/MockWorldID.sol";

contract WorldIDVerificationTest is Test {
    Election public election;
    ElectionManager public electionManager;
    MockWorldID public mockWorldID;

    address public user1;
    address public user2;
    address public creator;

    function setUp() public {
        // Set up test users
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        creator = makeAddr("creator");

        // Deploy MockWorldID for testing
        mockWorldID = new MockWorldID();

        // Deploy ElectionManager
        electionManager = new ElectionManager(IWorldID(address(mockWorldID)));

        // Grant creator role to creator address
        vm.prank(address(this)); // Default admin
        electionManager.grantCreatorRole(creator);

        // Create an election
        vm.startPrank(creator);
        ElectionManager.Candidate[] memory candidates = new ElectionManager.Candidate[](3);
        candidates[0] = ElectionManager.Candidate({
            name: "Alice Johnson",
            description: "Community leader"
        });
        candidates[1] = ElectionManager.Candidate({
            name: "Bob Smith",
            description: "Tech advocate"
        });
        candidates[2] = ElectionManager.Candidate({
            name: "Carol Davis",
            description: "Environmental champion"
        });

        uint256 electionId = electionManager.createElection(
            "Test Election",
            "A test election for World ID verification",
            "test-election-action",
            candidates
        );

        // Get the election contract
        (uint256 id, string memory title, string memory description, string memory worldIdAction,
         address creator_, address electionAddress, uint256 createdAt, bool active) = electionManager.elections(electionId);
        election = Election(electionAddress);
        vm.stopPrank();

        console.log("=== World ID Verification Test Setup ===");
        console.log("MockWorldID deployed at:", address(mockWorldID));
        console.log("ElectionManager deployed at:", address(electionManager));
        console.log("Election deployed at:", address(election));
    }

    function test_ContractDeployment() public view {
        console.log("\n=== Testing Contract Deployment ===");

        // Verify contract is configured correctly
        assertEq(address(election.worldId()), address(mockWorldID));
        assertEq(election.groupId(), 1); // Orb-verified only
        assertGt(election.externalNullifierHash(), 0); // Should be computed from app ID and action
        assertEq(election.candidateCount(), 3); // Should have 3 candidates

        console.log("[PASS] Contract deployment and configuration correct");
        console.log("World ID Router:", address(election.worldId()));
        console.log("Group ID:", election.groupId());
        console.log("External Nullifier Hash:", election.externalNullifierHash());
        console.log("Candidate Count:", election.candidateCount());
    }

    function test_InvalidProofRejection() public {
        console.log("\n=== Testing Invalid Proof Rejection ===");

        // Configure MockWorldID to reject proofs
        mockWorldID.setVerificationFailure(true, "Invalid proof");

        // Create vote data
        uint256 signal = uint256(keccak256(abi.encodePacked(uint256(1), false))); // Vote for candidate 1
        uint256 root = 123456789;
        uint256 voterId = 987654321;
        uint256[8] memory invalidProof = [
            uint256(1), uint256(2), uint256(3), uint256(4),
            uint256(5), uint256(6), uint256(7), uint256(8)
        ];

        Election.RankingEntry[] memory ranking = new Election.RankingEntry[](1);
        ranking[0] = Election.RankingEntry({
            candidateId: 1,
            tiedWithPrevious: false
        });

        // This should revert because MockWorldID is configured to fail
        vm.prank(user1);
        vm.expectRevert("Invalid proof");
        election.vote(signal, root, voterId, invalidProof, ranking);

        // Reset MockWorldID for other tests
        mockWorldID.reset();

        console.log("[PASS] Invalid proof correctly rejected by World ID Router");
    }

    function test_VoteStorageAndRetrieval() public {
        console.log("\n=== Testing Vote Storage and Retrieval ===");

        // Test basic contract state queries
        uint256 totalVoters = election.getVoteCount();
        console.log("Initial total voters:", totalVoters);
        assertEq(totalVoters, 0);

        uint256[] memory voters = election.getAllVoters();
        console.log("Initial voters array length:", voters.length);
        assertEq(voters.length, 0);

        (uint256 totalVotersStats, uint256 totalComparisons, uint256 candidateCount) = election.getVotingStats();
        console.log("Stats - Voters:", totalVotersStats);
        console.log("Stats - Comparisons:", totalComparisons);
        console.log("Stats - Candidates:", candidateCount);
        assertEq(totalVotersStats, 0);
        assertEq(totalComparisons, 0);
        assertEq(candidateCount, 3); // We added 3 candidates in setup

        // Test empty vote retrieval
        uint256 testVoterId = 12345;
        Election.RankingEntry[] memory emptyVote = election.getVote(testVoterId);
        console.log("Empty vote length:", emptyVote.length);
        assertEq(emptyVote.length, 0);

        console.log("[PASS] Vote storage and retrieval working correctly");
    }

    function test_VoteValidation() public {
        console.log("\n=== Testing Vote Validation ===");

        uint256 signal = uint256(keccak256("test"));
        uint256 root = 123456789;
        uint256 voterId = 987654321;
        uint256[8] memory proof = [
            uint256(1), uint256(2), uint256(3), uint256(4),
            uint256(5), uint256(6), uint256(7), uint256(8)
        ];

        // Test empty ranking
        Election.RankingEntry[] memory emptyRanking = new Election.RankingEntry[](0);

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("RankingEmpty()"));
        election.vote(signal, root, voterId, proof, emptyRanking);

        // Test invalid candidate ID
        Election.RankingEntry[] memory invalidRanking = new Election.RankingEntry[](1);
        invalidRanking[0] = Election.RankingEntry({
            candidateId: 999, // Invalid - only have 3 candidates
            tiedWithPrevious: false
        });

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("InvalidCandidateId(uint256)", 999));
        election.vote(signal, root, voterId + 1, proof, invalidRanking);

        // Test first entry tied with previous
        Election.RankingEntry[] memory tiedFirstRanking = new Election.RankingEntry[](1);
        tiedFirstRanking[0] = Election.RankingEntry({
            candidateId: 1,
            tiedWithPrevious: true // Invalid - first entry cannot be tied
        });

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSignature("FirstEntryCannotBeTied()"));
        election.vote(signal, root, voterId + 2, proof, tiedFirstRanking);

        console.log("[PASS] Vote validation working correctly");
    }
}
