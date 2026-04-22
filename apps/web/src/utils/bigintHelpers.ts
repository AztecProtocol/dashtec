/**
 * Safely converts a string to BigInt, handling various notations including scientific notation
 * @param value - The value to convert (string, number, or already BigInt)
 * @returns BigInt representation of the value
 * @throws Error if the value cannot be converted to a valid BigInt
 */
export function stringToBigInt(value: string | number | bigint | null | undefined): bigint {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return BigInt(0);
  }

  // Already a BigInt
  if (typeof value === 'bigint') {
    return value;
  }

  // Handle number type (including scientific notation)
  if (typeof value === 'number') {
    // Check if it's a valid number
    if (!isFinite(value)) {
      throw new Error(`Invalid number: ${value}`);
    }
    // Convert to integer string (removes decimals)
    return BigInt(Math.floor(value));
  }

  // Handle string type
  if (typeof value === 'string') {
    // Trim whitespace
    const trimmed = value.trim();

    // Empty string after trim
    if (trimmed === '' || trimmed === 'N/A') {
      return BigInt(0);
    }

    // Handle scientific notation (e.g., "1.5e+20", "1e10")
    if (trimmed.includes('e') || trimmed.includes('E')) {
      try {
        const num = parseFloat(trimmed);
        if (!isFinite(num)) {
          throw new Error(`Invalid scientific notation: ${trimmed}`);
        }
        // Convert to integer (floor to remove decimals)
        return BigInt(Math.floor(num));
      } catch (error) {
        throw new Error(`Failed to parse scientific notation: ${trimmed}`);
      }
    }

    // Handle decimal strings (e.g., "123.456")
    if (trimmed.includes('.')) {
      // Take only the integer part before the decimal
      const integerPart = trimmed.split('.')[0];
      if (integerPart === '' || integerPart === '-') {
        return BigInt(0);
      }
      return BigInt(integerPart);
    }

    // Handle hex notation (e.g., "0x123")
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      return BigInt(trimmed);
    }

    // Regular integer string
    try {
      return BigInt(trimmed);
    } catch (error) {
      throw new Error(`Failed to convert string to BigInt: ${trimmed}`);
    }
  }

  throw new Error(`Unsupported type for BigInt conversion: ${typeof value}`);
}

/**
 * Safely converts a string to BigInt with a fallback value
 * @param value - The value to convert
 * @param fallback - The fallback value if conversion fails (default: 0n)
 * @returns BigInt representation or fallback
 */
export function stringToBigIntSafe(
  value: string | number | bigint | null | undefined,
  fallback: bigint = BigInt(0)
): bigint {
  try {
    return stringToBigInt(value);
  } catch (error) {
    console.warn('Failed to convert to BigInt, using fallback:', { value, error });
    return fallback;
  }
}
