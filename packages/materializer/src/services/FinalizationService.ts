import { ponderDb } from '../db/ponder.js';
import { CheckpointService } from './CheckpointService.js';
import * as schema from '@dashtec/indexer-ponder/ponder.schema';
import { asc, gt } from 'drizzle-orm';

export class FinalizationService {
  private checkpointService: CheckpointService;

  constructor() {
    this.checkpointService = new CheckpointService();
  }

  async processNewFinalizedBlocks() {
  }

  private async runMaterializer(id: string, materializer: { materialize: (block: bigint) => Promise<void> }) {
    const lastBlock = await this.checkpointService.getLastProcessedBlock(id);
    const checkpointBlock = BigInt(lastBlock);

    // Fetch batch of new proofs starting from lastBlock + 1
    const newProofs = await ponderDb
      .select()
      .from(schema.l2ProofVerified)
      .where(gt(schema.l2ProofVerified.block_number, checkpointBlock))
      .orderBy(asc(schema.l2ProofVerified.block_number))
      .limit(50);

    if (newProofs.length === 0) return;

    if (newProofs.length > 5) {
      console.log(`[${id}] Processing batch of ${newProofs.length} finalized blocks (from ${lastBlock})`);
    }

    for (const proof of newProofs) {
      const l1BlockNumber = String(proof.block_number);
      const l2BlockNumber = BigInt(proof.l2_block_number);

      await materializer.materialize(l2BlockNumber);

      // Update checkpoint for this materializer
      await this.checkpointService.updateCheckpoint(id, l1BlockNumber, '0');
    }
  }
}
