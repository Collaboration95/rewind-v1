const { spawnSync } = require('node:child_process');

// Keep the repository's dependency-free filesystem contracts separate from
// Jest so they remain runnable before React Native is transformed. The npm
// `test` script runs this lane before the Jest component lane.
const result = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    '--test',
    'tests/scaffold.test.mjs',
    'tests/tooling.test.mjs',
    'tests/routes.test.mjs',
    'tests/media-contract.test.mjs',
    'tests/local-database.test.mjs',
    '../../packages/domain/tests/domain.test.mjs',
    '../../packages/domain/tests/boundary.test.mjs',
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
