# @dashtec/shared-utils

Shared utility functions for the Dashtec monorepo.

## Usage

```typescript
// Import all utils
import { formatAddress, formatWeiToEth, isValidAddress } from '@dashtec/shared-utils';

// Import specific modules
import { formatPercentage } from '@dashtec/shared-utils/formatters';
import { normalizeAddress } from '@dashtec/shared-utils/validators';
import { retry, sleep } from '@dashtec/shared-utils/contracts';
```

## Contents

- `formatters.ts` - Formatting utilities for addresses, numbers, dates
- `validators.ts` - Validation utilities for addresses, epochs, slots
- `contracts.ts` - Contract interaction utilities, retry logic, helpers
- `logger.ts` - Winston logger configuration and utilities
