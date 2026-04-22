#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * This script validates environment variables and can be run independently
 * or as part of the build process.
 * 
 * Usage:
 *   npm run validate-env
 *   node scripts/validate-env.js
 */

// Load environment variables from .env file if it exists
const fs = require('fs');
const path = require('path');

// Simple .env file loader
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  }
}

// Load .env file
loadEnvFile();

// Environment variable configurations
const ENV_VARS = [
  // Required environment variables
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection URL for the main database',
    validator: (value) => value.startsWith('postgresql://'),
  },
  {
    name: 'SESSION_PASSWORD',
    required: true,
    description: 'Password for session encryption (must be at least 32 characters)',
    validator: (value) => value.length >= 32,
  },
  {
    name: 'ROLLUP_CONTRACT_ADDRESS',
    required: true,
    description: 'Ethereum contract address for the rollup contract',
    validator: (value) => /^0x[a-fA-F0-9]{40}$/.test(value),
  },
  {
    name: 'SLASHING_PROPOSER_CONTRACT_ADDRESS',
    required: true,
    description: 'Ethereum contract address for the slashing proposer contract',
    validator: (value) => /^0x[a-fA-F0-9]{40}$/.test(value),
  },
  {
    name: 'STAKING_REGISTRY_CONTRACT_ADDRESS',
    required: true,
    description: 'Ethereum contract address for the staking registry contract',
    validator: (value) => /^0x[a-fA-F0-9]{40}$/.test(value),
  },
  {
    name: 'ETHEREUM_RPC_URL',
    required: true,
    description: 'Ethereum RPC URL for blockchain interactions',
    validator: (value) => value.startsWith('http'),
  },
  {
    name: 'NEXT_SENTINEL_URL',
    required: true,
    description: 'URL for the Aztec Sentinel API',
    validator: (value) => value.startsWith('http'),
  },
  {
    name: 'X_CLIENT_ID',
    required: true,
    description: 'X (Twitter) OAuth client ID for authentication',
  },
  {
    name: 'X_CLIENT_SECRET',
    required: true,
    description: 'X (Twitter) OAuth client secret for authentication',
  },
  {
    name: 'DISCORD_CLIENT_ID',
    required: true,
    description: 'Discord OAuth client ID for authentication',
  },
  {
    name: 'DISCORD_CLIENT_SECRET',
    required: true,
    description: 'Discord OAuth client secret for authentication',
  },
  {
    name: 'APP_URL',
    required: true,
    description: 'Public URL of the application for OAuth redirects',
    validator: (value) => value.startsWith('http'),
  },
  {
    name: 'ETHEREUM_EXPLORER_URL',
    required: true,
    description: 'Ethereum block explorer URL for transaction and address links',
    validator: (value) => value.startsWith('http'),
  },

  // Optional environment variables with defaults
  {
    name: 'DATABASE_URL_REPLICA',
    required: false,
    description: 'PostgreSQL database connection URL for read replicas (optional)',
    validator: (value) => value.startsWith('postgresql://'),
  },
  {
    name: 'RATE_LIMITING_ENABLED',
    required: false,
    description: 'Enable/disable rate limiting (default: true)',
    defaultValue: 'true',
    validator: (value) => ['true', 'false'].includes(value.toLowerCase()),
  },
  {
    name: 'CHAIN_NAME',
    required: false,
    description: 'Blockchain network name (mainnet/sepolia, default: sepolia)',
    defaultValue: 'sepolia',
    validator: (value) => ['mainnet', 'sepolia'].includes(value.toLowerCase()),
  },
  {
    name: 'PORT',
    required: false,
    description: 'Port number for the application (default: 3000)',
    defaultValue: '3000',
    validator: (value) => !isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 65535,
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Node.js environment (development/production/test)',
    defaultValue: 'development',
    validator: (value) => ['development', 'production', 'test'].includes(value),
  },
];

/**
 * Validate a single environment variable
 */
function validateEnvVar(config) {
  const value = process.env[config.name];

  // Check if required variable is missing
  if (config.required && !value) {
    return { isValid: false, error: `Required environment variable ${config.name} is missing` };
  }

  // If not required and missing, use default
  if (!value && config.defaultValue) {
    return { isValid: true, warning: `Optional environment variable ${config.name} not set, using default: ${config.defaultValue}` };
  }

  // If value exists, validate it
  if (value && config.validator) {
    try {
      const isValid = config.validator(value);
      if (!isValid) {
        return { isValid: false, error: `Environment variable ${config.name} has invalid value: ${value}` };
      }
    } catch (error) {
      return { isValid: false, error: `Environment variable ${config.name} validation failed: ${error}` };
    }
  }

  return { isValid: true };
}

/**
 * Validate all environment variables
 */
function validateEnvironment() {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    missing: [],
    invalid: [],
  };

  console.log('🔍 Validating environment variables...\n');

  for (const config of ENV_VARS) {
    const validation = validateEnvVar(config);

    if (!validation.isValid) {
      result.isValid = false;
      result.errors.push(validation.error);
      if (config.required) {
        result.missing.push(config.name);
      } else {
        result.invalid.push(config.name);
      }
    } else if (validation.warning) {
      result.warnings.push(validation.warning);
    }

    // Log the status
    const status = validation.isValid ? '✅' : '❌';
    const value = process.env[config.name] || config.defaultValue || '(not set)';
    console.log(`${status} ${config.name}: ${value}`);
    console.log(`   ${config.description}`);
    if (validation.error) {
      console.log(`   Error: ${validation.error}`);
    }
    if (validation.warning) {
      console.log(`   Warning: ${validation.warning}`);
    }
    console.log('');
  }

  return result;
}

/**
 * Validate environment variables and throw error if validation fails
 */
function validateEnvironmentOrThrow() {
  const result = validateEnvironment();

  if (!result.isValid) {
    console.error('\n❌ Environment validation failed!');
    console.error('\nMissing required environment variables:');
    result.missing.forEach(name => console.error(`  - ${name}`));

    console.error('\nInvalid environment variables:');
    result.invalid.forEach(name => console.error(`  - ${name}`));

    console.error('\nPlease check your .env file and ensure all required variables are set correctly.');
    console.error('You can copy .env-example to .env and fill in the required values.');

    throw new Error('Environment validation failed');
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment validation warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.log('✅ Environment validation passed!\n');
}

// Main execution
console.log('🚀 Starting environment validation...\n');

try {
  validateEnvironmentOrThrow();
  console.log('🎉 All environment variables are valid!');
  process.exit(0);
} catch (error) {
  console.error('💥 Environment validation failed:', error.message);
  process.exit(1);
}