export const TallySlashingProposerABI = [
  {
    "name": "getSlashTargetCommittees",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "name": "_round",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "committees",
        "type": "address[][]"
      }
    ]
  },
  {
    "name": "getTally",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "name": "_round",
        "type": "uint256"
      },
      {
        "name": "_committees",
        "type": "address[][]"
      }
    ],
    "outputs": [
      {
        "name": "actions",
        "type": "tuple[]",
        "components": [
          {
            "name": "attester",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          }
        ]
      }
    ]
  },
  {
    "name": "getPayloadAddress",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "name": "_round",
        "type": "uint256"
      },
      {
        "name": "_actions",
        "type": "tuple[]",
        "components": [
          {
            "name": "attester",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ]
  },
  {
    "type": "event",
    "name": "VoteCast",
    "inputs": [
      {
        "name": "round",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "slot",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "proposer",
        "type": "address",
        "indexed": true
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoundExecuted",
    "inputs": [
      {
        "name": "round",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "slashCount",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Slashed",
    "inputs": [
      {
        "name": "attester",
        "type": "address",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  }
] as const;
