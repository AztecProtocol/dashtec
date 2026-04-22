# @dashtec/shared-types

Shared TypeScript types and interfaces for the Dashtec monorepo.

## Usage

```typescript
// Import all types
import type { ValidatorWithPerformance, EpochSummary } from '@dashtec/shared-types';

// Import specific modules
import type { SlashProposal } from '@dashtec/shared-types/proposers';
import type { ValidatorStatus } from '@dashtec/shared-types/validators';
```

## Contents

- `validators.ts` - Validator-related types
- `epochs.ts` - Epoch and attestation types
- `proposers.ts` - Governance and slashing proposal types
