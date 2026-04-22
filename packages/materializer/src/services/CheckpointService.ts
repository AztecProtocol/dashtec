import { prisma } from '../db/prisma.js';
import { config } from '../config.js';

export interface Checkpoint {
  blockNumber: string;
  logIndex: string;
  count: number;
}

export class CheckpointService {

  /** Get the last processed block number for a specific materializer. */
  async getLastProcessedBlock(materializerId: string): Promise<string> {
    const checkpoint = await this.getCheckpoint(materializerId);
    return checkpoint?.blockNumber ?? '0';
  }

  /** Get full checkpoint (blockNumber + logIndex + count) for a materializer. */
  async getCheckpoint(materializerId: string): Promise<Checkpoint | null> {
    const checkpoint = await prisma.materializerCheckpoint.findUnique({
      where: { checkpointName_rollup_address: { checkpointName: materializerId, rollup_address: config.ROLLUP_CONTRACT_ADDRESS } },
    });

    if (!checkpoint) return null;

    return {
      blockNumber: checkpoint.blockNumber,
      logIndex: checkpoint.logIndex,
      count: checkpoint.count,
    };
  }

  /** Update the checkpoint for a specific materializer, incrementing count by processed rows. */
  async updateCheckpoint(materializerId: string, blockNumber: string, logIndex: string, processedRows: number = 0): Promise<void> {
    await prisma.materializerCheckpoint.upsert({
      where: { checkpointName_rollup_address: { checkpointName: materializerId, rollup_address: config.ROLLUP_CONTRACT_ADDRESS } },
      create: {
        checkpointName: materializerId,
        rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
        blockNumber,
        logIndex,
        count: processedRows,
      },
      update: {
        blockNumber,
        logIndex,
        count: { increment: processedRows },
      },
    });
  }

  /** Reset checkpoint to a specific cursor with an absolute count (used after reorg recovery). */
  async resetCheckpoint(materializerId: string, blockNumber: string, logIndex: string, absoluteCount: number): Promise<void> {
    await prisma.materializerCheckpoint.upsert({
      where: { checkpointName_rollup_address: { checkpointName: materializerId, rollup_address: config.ROLLUP_CONTRACT_ADDRESS } },
      create: {
        checkpointName: materializerId,
        rollup_address: config.ROLLUP_CONTRACT_ADDRESS,
        blockNumber,
        logIndex,
        count: absoluteCount,
      },
      update: {
        blockNumber,
        logIndex,
        count: absoluteCount,
      },
    });
  }
}
