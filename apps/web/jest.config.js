const nextJest = require('next/jest');

// Provide the path to your Next.js app to load next.config.js and .env files in your test environment
const createJestConfig = nextJest({ dir: './' });

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // All your test files will run in a Node.js environment
  testEnvironment: 'node', // Use 'node' for server-side tests, 'jest-environment-jsdom' for client-side components

  // Add more setup options before each test is run (optional)
  setupFilesAfterEnv: [],

  // Handle module aliases (e.g., for '@/lib/foo')
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Use @swc/jest to transpile TypeScript and JavaScript files
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },

  // If you have specific modules that need to be transpiled but are in node_modules,
  // you might need to adjust transformIgnorePatterns.
  // next/jest usually handles this well for common Next.js dependencies.
  // transformIgnorePatterns: ['/node_modules/(?!(some-esm-module)/)'],

  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

// createJestConfig is initially passed the project's Next.js config in testEnvironment,
// which is why the Next.js setup is inside this function.
module.exports = createJestConfig(customJestConfig);