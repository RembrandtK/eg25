// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "contracts/PeerRanking.sol";
import "contracts/ElectionManager.sol";

contract WorldIDVerificationTest is Test {
    PeerRanking public peerRanking;
    ElectionManager public electionManager;
    
    address public user1;
    address public user2;
    
    // Configuration from environment
    address public worldIDRouter;
    string public appId;
    string public action;
    
    function setUp() public {
        // Get configuration from environment
        worldIDRouter = vm.envAddress("WORLD_ID_ROUTER_ADDRESS");
        appId = vm.envString("WORLD_ID_APP_ID");
        action = vm.envString("WORLD_ID_ACTION");
        
        // Set up test users
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        // Deploy contracts using World ID Router address
        electionManager = new ElectionManager(IWorldID(worldIDRouter));
        peerRanking = new PeerRanking(IWorldID(worldIDRouter), appId, action, electionManager);
        
        // Add test candidates
        electionManager.addCandidate("Alice Johnson", "Community leader");
        electionManager.addCandidate("Bob Smith", "Tech advocate");
        electionManager.addCandidate("Carol Davis", "Environmental champion");
        
        console.log("=== World ID Verification Test Setup ===");
        console.log("World ID Router:", worldIDRouter);
        console.log("App ID:", appId);
        console.log("Action:", action);
        console.log("PeerRanking deployed at:", address(peerRanking));
    }
    
    function test_ContractDeployment() public view {
        console.log("\n=== Testing Contract Deployment ===");
        
        // Verify contract is configured correctly
        assertEq(address(peerRanking.worldId()), worldIDRouter);
        assertEq(peerRanking.groupId(), 1); // Orb-verified only
        assertGt(peerRanking.externalNullifierHash(), 0); // Should be computed from app ID and action
        
        console.log("[PASS] Contract deployment and configuration correct");
        console.log("World ID Router:", address(peerRanking.worldId()));
        console.log("Group ID:", peerRanking.groupId());
        console.log("External Nullifier Hash:", peerRanking.externalNullifierHash());
    }
    
    function test_InvalidProofRejection() public {
        console.log("\n=== Testing Invalid Proof Rejection ===");
        
        // Invalid proof data - should be rejected by real World ID Router
        address signal = user1;
        uint256 root = 123456789;
        uint256 nullifierHash = 987654321;
        uint256[8] memory invalidProof = [
            uint256(1), uint256(2), uint256(3), uint256(4),
            uint256(5), uint256(6), uint256(7), uint256(8)
        ];
        
        PeerRanking.RankingEntry[] memory ranking = new PeerRanking.RankingEntry[](1);
        ranking[0] = PeerRanking.RankingEntry({
            candidateId: 1,
            tiedWithPrevious: false
        });
        
        // This should revert because World ID Router will reject the invalid proof
        vm.prank(user1);
        vm.expectRevert();
        peerRanking.updateRanking(signal, root, nullifierHash, invalidProof, ranking);
        
        console.log("[PASS] Invalid proof correctly rejected by World ID Router");
    }
    
    function test_RankingValidation() public {
        console.log("\n=== Testing Ranking Validation ===");
        
        address signal = user1;
        uint256 root = 123456789;
        uint256 nullifierHash = 987654321;
        uint256[8] memory proof = [
            uint256(1), uint256(2), uint256(3), uint256(4),
            uint256(5), uint256(6), uint256(7), uint256(8)
        ];
        
        // Test empty ranking
        PeerRanking.RankingEntry[] memory emptyRanking = new PeerRanking.RankingEntry[](0);
        
        vm.prank(user1);
        vm.expectRevert("Ranking cannot be empty");
        peerRanking.updateRanking(signal, root, nullifierHash, proof, emptyRanking);
        
        // Test invalid candidate ID
        PeerRanking.RankingEntry[] memory invalidRanking = new PeerRanking.RankingEntry[](1);
        invalidRanking[0] = PeerRanking.RankingEntry({
            candidateId: 999, // Invalid - only have 3 candidates
            tiedWithPrevious: false
        });
        
        vm.prank(user1);
        vm.expectRevert("Invalid candidate ID");
        peerRanking.updateRanking(signal, root, nullifierHash + 1, proof, invalidRanking);
        
        // Test first entry tied with previous
        PeerRanking.RankingEntry[] memory tiedFirstRanking = new PeerRanking.RankingEntry[](1);
        tiedFirstRanking[0] = PeerRanking.RankingEntry({
            candidateId: 1,
            tiedWithPrevious: true // Invalid - first entry cannot be tied
        });
        
        vm.prank(user1);
        vm.expectRevert("First entry cannot be tied with previous");
        peerRanking.updateRanking(signal, root, nullifierHash + 2, proof, tiedFirstRanking);
        
        console.log("[PASS] Ranking validation working correctly");
    }
}
