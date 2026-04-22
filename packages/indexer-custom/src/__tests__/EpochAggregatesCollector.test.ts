/**
 * Unit tests for EpochAggregatesCollector
 * 
 * Tests collector logic by mocking database and service dependencies.
 */

// Mock dependencies before importing the collector
jest.mock('../lib/prisma', () => ({
  prisma: {
    epoch: {
      findMany: jest.fn(),
    },
    validatorAttestation: {
      groupBy: jest.fn(),
    },
    appErrorLog: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../services/EpochService');
jest.mock('../services/RollupConfigService');

jest.mock('../config/config', () => ({
  config: {
    EPOCH_AGGREGATES_POLL_INTERVAL_MS: 300000,
    EPOCH_AGGREGATES_EPOCHS_TO_REPAIR: 50,
    EPOCH_AGGREGATES_BATCH_SIZE: 10,
    NODE_ENV: 'test',
  },
}));

import { prisma } from '../lib/prisma';
import { EpochService } from '../services/EpochService';
import { RollupConfigService } from '../services/RollupConfigService';
import { EpochAggregatesCollector } from '../collectors/EpochAggregatesCollector';

// Type the mocks
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const MockEpochService = EpochService as jest.MockedClass<typeof EpochService>;
const MockRollupConfigService = RollupConfigService as jest.Mocked<typeof RollupConfigService>;

describe('EpochAggregatesCollector', () => {
  let collector: EpochAggregatesCollector;
  let mockUpdateEpochAggregates: jest.Mock;
  let mockUpdateValidatorEpochPerformance: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup RollupConfigService singleton mock
    MockRollupConfigService.getInstance = jest.fn().mockReturnValue({});

    // Setup EpochService mock
    mockUpdateEpochAggregates = jest.fn().mockResolvedValue(undefined);
    mockUpdateValidatorEpochPerformance = jest.fn().mockResolvedValue(undefined);
    MockEpochService.mockImplementation(() => ({
      updateEpochAggregates: mockUpdateEpochAggregates,
      updateValidatorEpochPerformance: mockUpdateValidatorEpochPerformance,
    }) as unknown as EpochService);

    // Create collector instance
    collector = new EpochAggregatesCollector();
  });

  afterEach(async () => {
    await collector.shutdown();
  });

  describe('collectData', () => {
    it('should update validator performance and aggregates for all epochs', async () => {
      // Arrange: Mock epochs
      (mockPrisma.epoch.findMany as jest.Mock).mockResolvedValue([
        { epoch_number: BigInt(102) },
        { epoch_number: BigInt(101) },
        { epoch_number: BigInt(100) },
      ]);

      // Mock validator attestations grouped by epoch and validator
      (mockPrisma.validatorAttestation.groupBy as jest.Mock).mockResolvedValue([
        { epoch_number: BigInt(100), validator_address: '0xvalidator1' },
        { epoch_number: BigInt(100), validator_address: '0xvalidator2' },
        { epoch_number: BigInt(101), validator_address: '0xvalidator1' },
        { epoch_number: BigInt(102), validator_address: '0xvalidator1' },
      ]);

      // Act
      await (collector as any).collectData();

      // Assert: Should have called updateValidatorEpochPerformance for each validator+epoch
      expect(mockUpdateValidatorEpochPerformance).toHaveBeenCalledTimes(4);
      expect(mockUpdateValidatorEpochPerformance).toHaveBeenCalledWith(BigInt(100), '0xvalidator1');
      expect(mockUpdateValidatorEpochPerformance).toHaveBeenCalledWith(BigInt(100), '0xvalidator2');
      expect(mockUpdateValidatorEpochPerformance).toHaveBeenCalledWith(BigInt(101), '0xvalidator1');
      expect(mockUpdateValidatorEpochPerformance).toHaveBeenCalledWith(BigInt(102), '0xvalidator1');

      // Assert: Should have called updateEpochAggregates for each epoch
      expect(mockUpdateEpochAggregates).toHaveBeenCalledTimes(3);
      expect(mockUpdateEpochAggregates).toHaveBeenCalledWith(BigInt(100));
      expect(mockUpdateEpochAggregates).toHaveBeenCalledWith(BigInt(101));
      expect(mockUpdateEpochAggregates).toHaveBeenCalledWith(BigInt(102));
    });

    it('should handle empty epoch list gracefully', async () => {
      // Arrange: No epochs to process
      (mockPrisma.epoch.findMany as jest.Mock).mockResolvedValue([]);

      // Act & Assert: Should not throw
      await expect((collector as any).collectData()).resolves.not.toThrow();
      expect(mockUpdateValidatorEpochPerformance).not.toHaveBeenCalled();
      expect(mockUpdateEpochAggregates).not.toHaveBeenCalled();
    });

    it('should handle epochs with no validators gracefully', async () => {
      // Arrange: Epochs exist but no validators
      (mockPrisma.epoch.findMany as jest.Mock).mockResolvedValue([
        { epoch_number: BigInt(100) },
      ]);
      (mockPrisma.validatorAttestation.groupBy as jest.Mock).mockResolvedValue([]);

      // Act
      await (collector as any).collectData();

      // Assert: No validator performance updates, but epoch aggregate might still be called
      expect(mockUpdateValidatorEpochPerformance).not.toHaveBeenCalled();
    });

    it('should continue processing when one validator fails', async () => {
      // Arrange
      (mockPrisma.epoch.findMany as jest.Mock).mockResolvedValue([
        { epoch_number: BigInt(100) },
      ]);
      (mockPrisma.validatorAttestation.groupBy as jest.Mock).mockResolvedValue([
        { epoch_number: BigInt(100), validator_address: '0xvalidator1' },
        { epoch_number: BigInt(100), validator_address: '0xvalidator2' },
      ]);

      mockUpdateValidatorEpochPerformance
        .mockRejectedValueOnce(new Error('DB error'))  // validator1 fails
        .mockResolvedValueOnce(undefined);              // validator2 succeeds

      // Act: Should not throw
      await expect((collector as any).collectData()).resolves.not.toThrow();

      // Assert: Both validators were attempted
      expect(mockUpdateValidatorEpochPerformance).toHaveBeenCalledTimes(2);
      // Epoch aggregates should still be called
      expect(mockUpdateEpochAggregates).toHaveBeenCalledWith(BigInt(100));
    });

    it('should skip collection if already running', async () => {
      // Arrange: Set isRunning to true
      (collector as any).metrics.isRunning = true;
      (mockPrisma.epoch.findMany as jest.Mock).mockResolvedValue([
        { epoch_number: BigInt(100) },
      ]);

      // Act
      await (collector as any).collectData();

      // Assert: Should not have queried or processed anything
      expect(mockPrisma.epoch.findMany).not.toHaveBeenCalled();
      expect(mockUpdateValidatorEpochPerformance).not.toHaveBeenCalled();
      expect(mockUpdateEpochAggregates).not.toHaveBeenCalled();
    });

    it('should record success metrics after successful run', async () => {
      // Arrange
      (mockPrisma.epoch.findMany as jest.Mock).mockResolvedValue([
        { epoch_number: BigInt(100) },
      ]);
      (mockPrisma.validatorAttestation.groupBy as jest.Mock).mockResolvedValue([
        { epoch_number: BigInt(100), validator_address: '0xvalidator1' },
      ]);

      const initialSuccessCount = (collector as any).metrics.successCount;

      // Act
      await (collector as any).collectData();

      // Assert
      expect((collector as any).metrics.successCount).toBe(initialSuccessCount + 1);
      expect((collector as any).metrics.isRunning).toBe(false);
    });
  });

  describe('checkDependencies', () => {
    it('should check database health', async () => {
      // Arrange
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      // Act
      const deps = await (collector as any).checkDependencies();

      // Assert
      expect(deps?.database).toBeDefined();
      expect(deps?.database?.status).toBe('HEALTHY');
    });
  });
});
