import { Prisma } from '@dashtec/database';

/** Build a Prisma where clause to find a validator by address or hex index */
export function validatorWhereByIdentifier(identifier: string): Prisma.ValidatorWhereInput {
  const lower = identifier.toLowerCase();
  const isAddress = lower.startsWith('0x') && lower.length === 42;
  return isAddress
    ? { address: lower }
    : { validator_hex_index: lower.toUpperCase() };
}
