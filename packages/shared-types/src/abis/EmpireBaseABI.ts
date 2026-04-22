export const EmpireBaseABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "proposal",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "round",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "voter",
        "type": "address"
      }
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "proposal",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "round",
        "type": "uint256"
      }
    ],
    "name": "ProposalExecutable",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "proposal",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "round",
        "type": "uint256"
      }
    ],
    "name": "ProposalExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "payload",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "round",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "signaler",
        "type": "address"
      }
    ],
    "name": "SignalCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "payload",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "round",
        "type": "uint256"
      }
    ],
    "name": "PayloadSubmittable",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "payload",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "round",
        "type": "uint256"
      }
    ],
    "name": "PayloadSubmitted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "name": "_slot",
        "type": "uint256"
      }
    ],
    "name": "computeRound",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ROUND_SIZE",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "EXECUTION_DELAY_IN_ROUNDS",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "LIFETIME_IN_ROUNDS",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "QUORUM_SIZE",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentRound",
    "outputs": [
      {
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
        "name": "_instance",
        "type": "address"
      },
      {
        "name": "_round",
        "type": "uint256"
      }
    ],
    "name": "getRoundData",
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {
            "name": "lastSignalSlot",
            "type": "uint256"
          },
          {
            "name": "payloadWithMostSignals",
            "type": "address"
          },
          {
            "name": "executed",
            "type": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getInstance",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
