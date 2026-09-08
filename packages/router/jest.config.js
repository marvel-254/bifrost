const { pathsToModuleNameMapper } = require('ts-jest');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@bifrost/models$': '<rootDir>/../models/src/index.ts',
    '^@bifrost/providers$': '<rootDir>/../providers/src/index.ts',
    '^@bifrost/shared$': '<rootDir>/../shared/src/index.ts',
    '^@bifrost/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: false,
        diagnostics: false,
      },
    ],
  },
  clearMocks: true,
};
