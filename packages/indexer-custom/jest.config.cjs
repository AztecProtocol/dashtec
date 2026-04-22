/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',

  // Use @swc/jest for fast ESM-compatible transpilation
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },

  // Transform workspace ESM packages
  transformIgnorePatterns: [
    'node_modules/(?!(@dashtec)/)',
  ],

  testMatch: ['**/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/__tests__/**'],
};
