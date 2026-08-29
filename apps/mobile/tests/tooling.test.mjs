import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const packageManifest = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8'));
const makefile = readFileSync(join(repoRoot, 'Makefile'), 'utf8');
const workflow = readFileSync(join(repoRoot, '.github/workflows/mobile-quality.yml'), 'utf8');

test('mobile quality scripts are deterministic and non-watch', () => {
  const { scripts } = packageManifest;

  assert.equal(scripts.format, 'npm run format:write');
  assert.equal(scripts['format:write'], 'prettier --write .');
  assert.equal(scripts['format:check'], 'prettier --check .');
  assert.equal(scripts['open:ios'], 'expo start --ios');
  assert.equal(scripts['open:android'], 'expo start --android');
  assert.equal(scripts.ios, 'npm run open:ios');
  assert.equal(scripts.android, 'npm run open:android');
  assert.equal(scripts.lint, 'eslint .');
  assert.equal(scripts.typecheck, 'tsc --noEmit');
  assert.equal(scripts.test, 'node scripts/test.cjs');
  assert.match(scripts.check, /format:check/);
  assert.match(scripts.check, /lint/);
  assert.match(scripts.check, /typecheck/);
  assert.match(scripts.check, /test/);
});

test('root Makefile exposes local development and quality commands', () => {
  const targets = [
    'install',
    'start',
    'start-clear',
    'ios',
    'android',
    'web',
    'build-ios',
    'build-android',
    'build-web',
    'lint',
    'format',
    'format-check',
    'typecheck',
    'test',
    'workflow-check',
    'check',
  ];

  for (const target of targets) {
    assert.match(makefile, new RegExp(`^${target}:`, 'm'));
  }

  assert.match(makefile, /\$\(NPM\) --prefix \$\(MOBILE_DIR\)/);
  assert.doesNotMatch(makefile, /\beas\b|secrets?\.|expo\s+(build|submit|publish|update)/i);
});

test('mobile workflow is cached, local-only, and emulator-free', () => {
  assert.match(workflow, /^on:/m);
  assert.match(workflow, /push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /actions\/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd/);
  assert.match(workflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
  assert.match(workflow, /node-version-file: apps\/mobile\/\.nvmrc/);
  assert.match(workflow, /cache: npm/);
  assert.match(workflow, /cache-dependency-path: apps\/mobile\/package-lock\.json/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run format:check/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm run test/);
  assert.match(workflow, /npm run build:web/);
  assert.doesNotMatch(workflow, /secrets?\.|\beas\b|device farm|emulator/i);
});
