module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  // `uuid` (v9+) es ESM-only; Jest no puede parsearlo con el transform por
  // defecto. Se reemplaza por un shim CJS solo en tests.
  moduleNameMapper: {
    '^uuid$': '<rootDir>/test-utils/uuid-mock.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
};
