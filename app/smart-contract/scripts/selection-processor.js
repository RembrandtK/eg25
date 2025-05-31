const { ethers } = require("hardhat");
const { VoteReader } = require("./vote-reader");
const { TidemanCalculator } = require("./tideman-calculator");

/**
 * Selection Processor - Integrates with Election Contract Selection State
 * 
 * This processor handles the complete selection cycle:
 * 1. Determine the block to use for data retrieval (last complete block)
 * 2. Read votes from that specific block state
 * 3. Run Tideman calculation
 * 4. Record results on the contract
 * 
 * The block selection ensures deterministic results across all nodes.
 */

// Enhanced Election contract ABI with selection functions
const ELECTION_ABI = [
  // Existing functions
  {
    "inputs": [],
    "name": "getAllVoters",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "voterId", "type": "uint256"}],
    "name": "getVote",
    "outputs": [{"components": [{"internalType": "uint256", "name": "candidateId", "type": "uint256"}, {"internalType": "bool", "name": "tiedWithPrevious", "type": "bool"}], "internalType": "struct Election.RankingEntry[]", "name": "", "type": "tuple[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCandidates",
    "outputs": [{"components": [{"internalType": "uint256", "name": "id", "type": "uint256"}, {"internalType": "string", "name": "name", "type": "string"}, {"internalType": "string", "name": "description", "type": "string"}, {"internalType": "bool", "name": "active", "type": "bool"}], "internalType": "struct Election.Candidate[]", "name": "", "type": "tuple[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  // New selection functions
  {
    "inputs": [],
    "name": "closeVoting",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256[]", "name": "_selectedCandidates", "type": "uint256[]"}],
    "name": "completeSelection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSelectionResults",
    "outputs": [
      {"internalType": "bool", "name": "_selectionCompleted", "type": "bool"},
      {"internalType": "uint256[]", "name": "_selectedCandidates", "type": "uint256[]"},
      {"internalType": "uint256", "name": "_selectionBlock", "type": "uint256"},
      {"internalType": "uint256", "name": "_selectionTimestamp", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSelectionBlock",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isReadyForSelection",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getElectionStatus",
    "outputs": [
      {"internalType": "bool", "name": "_votingActive", "type": "bool"},
      {"internalType": "bool", "name": "_selectionCompleted", "type": "bool"},
      {"internalType": "uint256", "name": "_totalVoters", "type": "uint256"},
      {"internalType": "uint256", "name": "_candidateCount", "type": "uint256"},
      {"internalType": "uint256", "name": "_selectionBlock", "type": "uint256"},
      {"internalType": "uint256[]", "name": "_selectedCandidates", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

class SelectionProcessor {
  constructor(contractAddress, provider, signer = null) {
    this.contractAddress = contractAddress;
    this.provider = provider;
    this.signer = signer;
    this.contract = new ethers.Contract(contractAddress, ELECTION_ABI, provider);
    this.contractWithSigner = signer ? new ethers.Contract(contractAddress, ELECTION_ABI, signer) : null;
  }

  /**
   * Get the current election status
   */
  async getElectionStatus() {
    try {
      const status = await this.contract.getElectionStatus();
      return {
        votingActive: status._votingActive,
        selectionCompleted: status._selectionCompleted,
        totalVoters: Number(status._totalVoters),
        candidateCount: Number(status._candidateCount),
        selectionBlock: Number(status._selectionBlock),
        selectedCandidates: status._selectedCandidates.map(id => Number(id))
      };
    } catch (error) {
      console.error("Error getting election status:", error);
      throw error;
    }
  }

  /**
   * Check if election is ready for selection processing
   */
  async isReadyForSelection() {
    try {
      return await this.contract.isReadyForSelection();
    } catch (error) {
      console.error("Error checking selection readiness:", error);
      throw error;
    }
  }

  /**
   * Get the block number that should be used for selection
   */
  async getSelectionBlock() {
    try {
      const blockNumber = await this.contract.getSelectionBlock();
      return Number(blockNumber);
    } catch (error) {
      console.error("Error getting selection block:", error);
      throw error;
    }
  }

  /**
   * Close voting (must be called before selection)
   */
  async closeVoting() {
    if (!this.contractWithSigner) {
      throw new Error("Signer required for closing voting");
    }

    try {
      console.log("🔒 Closing voting...");
      const tx = await this.contractWithSigner.closeVoting();
      const receipt = await tx.wait();
      console.log(`✅ Voting closed. Transaction: ${receipt.hash}`);
      return receipt;
    } catch (error) {
      console.error("Error closing voting:", error);
      throw error;
    }
  }

  /**
   * Process selection using Tideman method with block-specific data
   */
  async processSelection() {
    try {
      console.log("🗳️ Processing Selection with Block-Specific Data");
      console.log("===============================================");

      // Check if ready for selection
      const ready = await this.isReadyForSelection();
      if (!ready) {
        const status = await this.getElectionStatus();
        if (status.votingActive) {
          throw new Error("Voting is still active. Close voting first.");
        }
        if (status.selectionCompleted) {
          throw new Error("Selection already completed.");
        }
        if (status.totalVoters === 0) {
          throw new Error("No votes to process.");
        }
      }

      // Get the block to use for data retrieval
      const selectionBlock = await this.getSelectionBlock();
      console.log(`📦 Using block ${selectionBlock} for data retrieval`);

      // Create vote reader with block-specific provider
      const blockProvider = this.provider;
      const voteReader = new VoteReader(this.contractAddress, blockProvider);

      // Read votes from the specific block
      console.log("📊 Reading votes from selection block...");
      const voteData = await voteReader.getAllVotes();
      
      if (voteData.votes.length === 0) {
        throw new Error("No valid votes found in selection block");
      }

      console.log(`Found ${voteData.votes.length} votes from ${voteData.candidates.length} candidates`);

      // Run Tideman calculation
      console.log("🧮 Running Tideman calculation...");
      const tidemanCalculator = new TidemanCalculator(voteReader);
      const result = await tidemanCalculator.calculate();

      console.log(`🏆 Winner: ${result.winner.name}`);
      console.log("📊 Final Ranking:");
      result.finalRanking.forEach(entry => {
        console.log(`   ${entry.rank}. ${entry.candidate.name}`);
      });

      return {
        selectionBlock,
        winner: result.winner,
        finalRanking: result.finalRanking,
        selectedCandidates: [result.winner.id], // Currently single winner, array for future
        pairwiseTallies: result.pairwiseTallies,
        rankedPairs: result.rankedPairs,
        lockedPairs: result.lockedPairs,
        voteData
      };
    } catch (error) {
      console.error("Error processing selection:", error);
      throw error;
    }
  }

  /**
   * Complete selection by recording results on contract
   */
  async completeSelection(selectionResults) {
    if (!this.contractWithSigner) {
      throw new Error("Signer required for completing selection");
    }

    try {
      console.log("📝 Recording selection results on contract...");
      
      const selectedCandidates = selectionResults.selectedCandidates;
      const tx = await this.contractWithSigner.completeSelection(selectedCandidates);
      const receipt = await tx.wait();
      
      console.log(`✅ Selection completed. Transaction: ${receipt.hash}`);
      console.log(`🏆 Selected candidates: ${selectedCandidates.join(', ')}`);
      
      return receipt;
    } catch (error) {
      console.error("Error completing selection:", error);
      throw error;
    }
  }

  /**
   * Run complete selection cycle
   */
  async runCompleteSelectionCycle() {
    try {
      console.log("🚀 Running Complete Selection Cycle");
      console.log("===================================");

      // 1. Check status
      const status = await this.getElectionStatus();
      console.log(`Current status: voting=${status.votingActive}, completed=${status.selectionCompleted}`);

      // 2. Close voting if needed
      if (status.votingActive) {
        await this.closeVoting();
      }

      // 3. Process selection
      const selectionResults = await this.processSelection();

      // 4. Complete selection on contract
      const receipt = await this.completeSelection(selectionResults);

      // 5. Get final status
      const finalStatus = await this.getElectionStatus();

      return {
        selectionResults,
        transactionReceipt: receipt,
        finalStatus
      };
    } catch (error) {
      console.error("Error in complete selection cycle:", error);
      throw error;
    }
  }

  /**
   * Get existing selection results if completed
   */
  async getSelectionResults() {
    try {
      const results = await this.contract.getSelectionResults();
      return {
        selectionCompleted: results._selectionCompleted,
        selectedCandidates: results._selectedCandidates.map(id => Number(id)),
        selectionBlock: Number(results._selectionBlock),
        selectionTimestamp: Number(results._selectionTimestamp)
      };
    } catch (error) {
      console.error("Error getting selection results:", error);
      throw error;
    }
  }
}

module.exports = { SelectionProcessor };
