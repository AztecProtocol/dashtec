export const GovernorContractABI = [
  {
    "type": "event",
    "name": "Proposed",
    "inputs": [
      {
        "name": "proposalId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "proposal",
        "type": "address",
        "indexed": true
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VoteCast",
    "inputs": [
      {
        "name": "proposalId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "voter",
        "type": "address",
        "indexed": true
      },
      {
        "name": "support",
        "type": "bool"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "anonymous": false
  }
] as const;
