import { prisma } from '../../lib/prisma';
import { createLogger } from '@dashtec/shared-utils';

const logger = createLogger('L2BlockProposedSync');

export interface InsertL2BlockProposedParams {
  id: string;
  l2BlockNumber: bigint;
  archive: string;
  versionedBlobHashes: string[];
  payloadDigest: string;
  attestationsHash: string;
  rollupAddress: string;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
  timestamp: bigint;
  coinbase: string;
  slotNumber: bigint;
}

/**
 * Insert L2BlockProposed event to Prisma
 */
export async function insertL2BlockProposed(params: InsertL2BlockProposedParams): Promise<void> {
  try {
    await prisma.l2BlockProposed.upsert({
      where: { id: params.id },
      create: {
        id: params.id,
        l2_block_number: params.l2BlockNumber,
        archive: params.archive,
        versioned_blob_hashes: JSON.stringify(params.versionedBlobHashes),
        payload_digest: params.payloadDigest,
        attestations_hash: params.attestationsHash,
        rollup_address: params.rollupAddress,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        slot_number: params.slotNumber,
        coinbase: params.coinbase,
      },
      update: {
        l2_block_number: params.l2BlockNumber,
        archive: params.archive,
        versioned_blob_hashes: JSON.stringify(params.versionedBlobHashes),
        payload_digest: params.payloadDigest,
        attestations_hash: params.attestationsHash,
        rollup_address: params.rollupAddress,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        slot_number: params.slotNumber,
        coinbase: params.coinbase,
      },
    });

    logger.debug(`Inserted L2BlockProposed for block ${params.l2BlockNumber}`);
  } catch (error) {
    logger.error('Error inserting L2BlockProposed', { error, params });
    throw error;
  }
}

/**
 * Check if L2BlockProposed already exists
 */
export async function l2BlockProposedExists(id: string): Promise<boolean> {
  try {
    const record = await prisma.l2BlockProposed.findUnique({
      where: { id },
    });
    return !!record;
  } catch (error) {
    logger.error('Error checking L2BlockProposed existence', { error, id });
    return false;
  }
}

export interface InsertL2ProofVerifiedParams {
  id: string;
  l2BlockNumber: bigint;
  proverId: string;
  blockNumber: bigint;
  transactionHash: string;
  epochNumber: string | null;
  logIndex: number;
  timestamp: bigint;
  transactionFrom: string;
  transactionTo: string | null;
  transactionGas: bigint;
  transactionGasPrice: bigint | null;
  transactionValue: bigint;
  transactionNonce: number;
  transactionMaxFeePerGas: bigint | null;
  transactionMaxPriorityFeePerGas: bigint | null;
}

/**
 * Insert L2ProofVerified event to Prisma
 */
export async function insertL2ProofVerified(params: InsertL2ProofVerifiedParams): Promise<void> {
  const logger = createLogger('L2ProofVerifiedSync');

  try {
    await prisma.l2ProofVerified.upsert({
      where: { id: params.id },
      create: {
        id: params.id,
        l2_block_number: params.l2BlockNumber,
        prover_id: params.proverId,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        epoch_number: params.epochNumber,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        transaction_from: params.transactionFrom,
        transaction_to: params.transactionTo,
        transaction_gas: params.transactionGas,
        transaction_gas_price: params.transactionGasPrice,
        transaction_value: params.transactionValue,
        transaction_nonce: params.transactionNonce,
        transaction_max_fee_per_gas: params.transactionMaxFeePerGas,
        transaction_max_priority_fee_per_gas: params.transactionMaxPriorityFeePerGas,
      },
      update: {
        l2_block_number: params.l2BlockNumber,
        prover_id: params.proverId,
        block_number: params.blockNumber,
        transaction_hash: params.transactionHash,
        epoch_number: params.epochNumber,
        log_index: params.logIndex,
        timestamp: params.timestamp,
        transaction_from: params.transactionFrom,
        transaction_to: params.transactionTo,
        transaction_gas: params.transactionGas,
        transaction_gas_price: params.transactionGasPrice,
        transaction_value: params.transactionValue,
        transaction_nonce: params.transactionNonce,
        transaction_max_fee_per_gas: params.transactionMaxFeePerGas,
        transaction_max_priority_fee_per_gas: params.transactionMaxPriorityFeePerGas,
      },
    });

    logger.debug(`Inserted L2ProofVerified for L2 block ${params.l2BlockNumber} by prover ${params.proverId}`);
  } catch (error) {
    logger.error('Error inserting L2ProofVerified', { error, params });
    throw error;
  }
}

/**
 * Check if L2ProofVerified already exists
 */
export async function l2ProofVerifiedExists(id: string): Promise<boolean> {
  const logger = createLogger('L2ProofVerifiedSync');

  try {
    const record = await prisma.l2ProofVerified.findUnique({
      where: { id },
    });
    return !!record;
  } catch (error) {
    logger.error('Error checking L2ProofVerified existence', { error, id });
    return false;
  }
}
