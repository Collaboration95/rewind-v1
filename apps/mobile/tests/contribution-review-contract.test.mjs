import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(...parts) {
  return readFileSync(join(appRoot, ...parts), 'utf8');
}

test('review and lock flow stays behind local policy and repository ports', () => {
  const route = read('app', '(tabs)', 'camera.tsx');
  const panel = read('features', 'capture', 'ContributionReviewPanel.tsx');
  const store = read('features', 'capture', 'local-contribution-review-store.ts');

  assert.match(route, /ContributionReviewPanel/);
  assert.match(route, /onContributionSaved/);
  assert.match(panel, /review-submit/);
  assert.match(panel, /review-discard/);
  assert.match(panel, /review-complete-processing/);
  assert.match(panel, /review-delete-confirmation/);
  assert.match(panel, /review-delete-confirm/);
  assert.match(panel, /review-retry-processing/);
  assert.match(panel, /ProcessingSimulationPort/);
  assert.match(panel, /PROCESSING_SIMULATION_DELAY_MS/);
  assert.doesNotMatch(panel, /localUri|<Image|<Video|share/i);
  assert.match(store, /validateContributionForSubmission/);
  assert.match(store, /startProcessing/);
  assert.match(store, /completeProcessing/);
  assert.match(store, /deleteContributionPolicy/);
  assert.match(store, /failProcessingPolicy/);
  assert.match(store, /retryProcessingPolicy/);
  assert.match(store, /deletionRecordsFromAuditEvents/);
  assert.match(store, /files\.remove/);
  assert.match(store, /repository\.contributions\.save/);
  assert.match(store, /repository\.contributions\.remove/);
  assert.match(store, /repository\.audit\.append/);
  assert.doesNotMatch(store, /fetch\(|axios|https?:\/\//i);
});
