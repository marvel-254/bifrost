/** Jest root config — runs all package tests via `pnpm test` */
module.exports = {
  projects: [
    '<rootDir>/packages/models',
    '<rootDir>/packages/providers',
    '<rootDir>/packages/reliability',
    '<rootDir>/packages/policy',
  ],
};
