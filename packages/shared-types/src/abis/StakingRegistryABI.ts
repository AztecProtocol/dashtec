export const StakingRegistryABI = [
  {
    "inputs": [],
    "name": "STAKING_ASSET",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "type": "function",
    "name": "providerConfigurations",
    "inputs": [
      {
        "name": "providerIdentifier",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "providerAdmin",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "providerTakeRate",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "providerRewardsRecipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "providerIdentifier",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "rollupAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "attester",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "coinbaseSplitContractAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "stakerAddress",
        "type": "address"
      }
    ],
    "name": "StakedWithProvider",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "providerIdentifier",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "attesters",
        "type": "address[]"
      }
    ],
    "name": "AttestersAddedToProvider",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "providerIdentifier",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "providerAdmin",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "providerTakeRate",
        "type": "uint16"
      }
    ],
    "name": "ProviderRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "providerIdentifier",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "attester",
        "type": "address"
      }
    ],
    "name": "ProviderQueueDripped",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "providerIdentifier",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "newTakeRate",
        "type": "uint16"
      }
    ],
    "name": "ProviderTakeRateUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "providerIdentifier",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "newRewardsRecipient",
        "type": "address"
      }
    ],
    "name": "ProviderRewardsRecipientUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "providerIdentifier",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "newAdmin",
        "type": "address"
      }
    ],
    "name": "ProviderAdminUpdateInitiated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "providerIdentifier",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "newAdmin",
        "type": "address"
      }
    ],
    "name": "ProviderAdminUpdated",
    "type": "event"
  }
] as const;
