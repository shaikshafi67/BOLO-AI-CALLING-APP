/** Jest runs TypeScript tests from tests/ via ts-jest. */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: { esModuleInterop: true, strict: true, target: 'ES2020', module: 'commonjs', types: ['jest', 'node'] } }],
  },
  testTimeout: 15000,
};
