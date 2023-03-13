/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '@app/(.*)$': '<rootDir>/src/$1',
    '@test/(.*)$': '<rootDir>/__tests__/$1',
  },
  'collectCoverageFrom': [
    'src/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 1,
      branches: 1,
      functions: 1,
      lines: 1
    }
  },

  transform: {
    '^.+\\.(ts|tsx)?$': ['ts-jest', {useESM: true}],
  },

  coverageReporters: ['clover', 'json', 'json-summary', 'lcov', ['text', { skipFull: true }]],
  testPathIgnorePatterns: ['/__fixtures__/', '/__utils__/', '/__mocks__/'],
};
