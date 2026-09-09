module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@bifrost/shared$': '<rootDir>/../../packages/shared/src',
    '^@bifrost/routing$': '<rootDir>/../../packages/router/src',
    '^@bifrost/policy$': '<rootDir>/../../packages/policy/src',
    '^@bifrost/compression$': '<rootDir>/../../packages/compression/src',
    '^@bifrost/cache$': '<rootDir>/../../packages/cache/src',
  },
};
