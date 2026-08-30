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
    'tests/camera-contract.test.mjs',
    'tests/video-capture-contract.test.mjs',
    'tests/photo-capture-contract.test.mjs',
    'tests/vignette-haptics-contract.test.mjs',
    'tests/contribution-review-contract.test.mjs',
    'tests/home-contract.test.mjs',
    'tests/local-database.test.mjs',
    'tests/local-contribution-review-database.test.mjs',
    '../../packages/domain/tests/domain.test.mjs',
    '../../packages/domain/tests/boundary.test.mjs',
    '../../packages/domain/tests/policy.test.mjs',
    '../../packages/domain/tests/simulation.test.mjs',
    '../../packages/domain/tests/session.test.mjs',
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
