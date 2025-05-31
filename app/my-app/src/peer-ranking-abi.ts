export const PEER_RANKING_CONTRACT_ADDRESS = "0x2caDc553c4B98863A3937fF0E710b79F7E855d8a";

export const PEER_RANKING_ABI = [
  {
    "inputs": [
      {
        "internalType": "contract IWorldIdAddressBook",
        "name": "_worldAddressBook",
        "type": "address"
      },
      {
        "internalType": "contract IElectionManager",
        "name": "_electionManager",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "candidateA",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "candidateB",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newCount",
        "type": "uint256"
      }
    ],
    "name": "ComparisonUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "newRanking",
        "type": "uint256[]"
      }
    ],
    "name": "RankingUpdated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_RANK",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "electionManager",
    "outputs": [
      {
        "internalType": "contract IElectionManager",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "candidateA",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "candidateB",
        "type": "uint256"
      }
    ],
    "name": "getComparisonCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalRankers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "candidateId",
        "type": "uint256"
      }
    ],
    "name": "getUserCandidateRank",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "candidateA",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "candidateB",
        "type": "uint256"
      }
    ],
    "name": "getUserPreference",
    "outputs": [
      {
        "internalType": "int8",
        "name": "",
        "type": "int8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserRanking",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasRanking",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "newRanking",
        "type": "uint256[]"
      }
    ],
    "name": "updateRanking",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
