import { Prisma } from '@dashtec/database';

export type BaseCTEOptions = {
  targetTable?: string;
};

export type SourceCTEOptions = BaseCTEOptions & {
  sourceTable?: string;
};

export type ValidatorAggregatesCTEOptions = BaseCTEOptions & {
  epochFilter?: Prisma.Sql;
  rollupAddresses?: string[];
  isActiveRollup?: boolean;
};

export type ValidatorScoresCTEOptions = SourceCTEOptions & {
  maxValuesTable?: string;
};

export type FinalSelectionOptions = {
  sourceTable?: string;
  includeCount?: boolean;
};
