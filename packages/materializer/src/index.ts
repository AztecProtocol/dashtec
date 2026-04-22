import { config } from './config.js';
import { createLogger } from '@dashtec/shared-utils';
import { ReorgDetector } from './services/ReorgDetector.js';
import { StatusDisplay } from './display/StatusDisplay.js';
import { BlockProposedMaterializer, ProofVerifiedMaterializer } from './materializers/blocks.js';
import { ProposerVoteMaterializer, PayloadSubmittableMaterializer, PayloadSubmittedMaterializer } from './materializers/governance.js';
import { StakedWithProviderMaterializer, ProviderQueueDripMaterializer } from './materializers/staking-events.js';
import { TallyVoteCastMaterializer, TallyRoundExecutedMaterializer, SlashSlashedMaterializer } from './materializers/tally-slashing.js';
import { ValidatorMaterializer } from './materializers/validator.js';
import { ValidatorQueueMaterializer } from './materializers/validator-queue.js';
import { ProviderMaterializer, ProviderAttesterMaterializer } from './materializers/provider.js';
import { ProviderValidatorListMaterializer } from './materializers/provider-validators.js';
import { CanonicalRollupUpdatedMaterializer } from './materializers/registry.js';
import { DepositLifecycleMaterializer } from './materializers/deposit-lifecycle.js';
import { GseDepositLifecycleMaterializer } from './materializers/gse-deposit-lifecycle.js';
import { FailedDepositLifecycleMaterializer } from './materializers/failed-deposit-lifecycle.js';
import { QueuedLifecycleMaterializer } from './materializers/queued-lifecycle.js';
import { WithdrawInitiatedLifecycleMaterializer } from './materializers/withdraw-initiated-lifecycle.js';
import { WithdrawFinalizedLifecycleMaterializer } from './materializers/withdraw-finalized-lifecycle.js';
import { StakeHistoryMaterializer } from './materializers/stake-history.js';
import { ValidatorRollupMaterializer } from './materializers/validator-rollup.js';
import type { BaseMaterializer } from './materializers/base.js';

const logger = createLogger('Materializer');
const POLL_INTERVAL_MS = 5000;

/** Initialize all materializers in processing order. */
function createMaterializers(): BaseMaterializer[] {
  return [
    // Group A: Direct event copies
    new BlockProposedMaterializer(),
    new ProofVerifiedMaterializer(),
    new CanonicalRollupUpdatedMaterializer(),
    new StakedWithProviderMaterializer(),
    new ProviderQueueDripMaterializer(),

    // Group A.1: Validator lifecycle event archives
    new DepositLifecycleMaterializer(),
    new GseDepositLifecycleMaterializer(),
    new FailedDepositLifecycleMaterializer(),
    new QueuedLifecycleMaterializer(),
    new WithdrawInitiatedLifecycleMaterializer(),
    new WithdrawFinalizedLifecycleMaterializer(),

    // Group A.2: Derived stake history (reads deposits, slashing, withdrawals)
    new StakeHistoryMaterializer(),

    // Group A.3: Validator-rollup mapping (reads deposits, derives migration status from lifecycle tables)
    new ValidatorRollupMaterializer(),

    // Group B: Enriched event copies (tally-slashing must come before slash)
    new ProposerVoteMaterializer(),
    new PayloadSubmittableMaterializer(),
    new PayloadSubmittedMaterializer(),
    new TallyVoteCastMaterializer(),
    new TallyRoundExecutedMaterializer(),
    new SlashSlashedMaterializer(),

    // Group C: State computation (order matters: providers before attesters)
    new ValidatorMaterializer(),
    new ValidatorQueueMaterializer(),
    new ProviderMaterializer(),
    new ProviderAttesterMaterializer(),
    new ProviderValidatorListMaterializer(),
  ];
}

async function main() {
  logger.info('Materializer Service Starting...');
  logger.info(`Connected to Ponder DB (Schema: ${config.PONDER_SCHEMA})`);

  const materializers = createMaterializers();
  const reorgDetector = new ReorgDetector();
  const display = new StatusDisplay(materializers.map(m => m.id));

  display.start();
  logger.info(`Registered ${materializers.length} materializers`);

  while (true) {
    try {
      // Check for reorgs before processing
      const reorgDetected = await reorgDetector.checkAndReset(materializers);
      display.setPonderBlock(reorgDetector.lastPonderMaxBlock);
      display.setReorgDetected(reorgDetected);

      // Run all materializers concurrently per poll cycle
      const results = await Promise.allSettled(
        materializers.map(async (materializer) => {
          display.setPolling(materializer.id);
          const start = performance.now();
          const processed = await materializer.poll();
          const duration = performance.now() - start;
          display.recordPoll(
            materializer.id,
            materializer.totalRows,
            materializer.lastCursor.blockNumber,
            duration,
          );
          return processed;
        })
      );

      let totalProcessed = 0;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          totalProcessed += result.value;
        } else {
          display.setError(materializers[i].id);
          logger.error(`Error in materializer ${materializers[i].id}:`, { error: result.reason });
        }
      }

      if (totalProcessed > 0) {
        logger.info(`Poll cycle complete: ${totalProcessed} total rows processed`);
      }
    } catch (error) {
      logger.error('Error in materializer loop:', { error });
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((error) => {
  logger.error('Fatal error:', { error });
  process.exit(1);
});
