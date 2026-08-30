import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const spec = readFileSync(join(repoRoot, 'planning/v1-prototype-spec.md'), 'utf8');
const adr = readFileSync(
  join(repoRoot, 'planning/decisions/ADR-0003-local-media-and-vignette-contract.md'),
  'utf8',
);
const decisionsReadme = readFileSync(join(repoRoot, 'planning/decisions/README.md'), 'utf8');
const backlog = readFileSync(join(repoRoot, 'planning/backlog/v1-github-backlog.md'), 'utf8');

test('accepted local photo/video contract is explicit and durable', () => {
  assert.match(spec, /issue #45/);
  assert.match(spec, /`mediaKind` is either `photo` or `video`/);
  assert.match(spec, /`durationSeconds: 3`/);
  assert.match(spec, /video duration is 1–15 seconds/);
  assert.match(spec, /`vignetteTreatment` is one of `flash`, `ccd`, `home-movie`, or `tape`/);
  assert.match(spec, /does not claim to alter source pixels or\s+audio/);
  assert.doesNotMatch(spec, /image posts/);

  assert.match(adr, /\*\*Status:\*\* Accepted/);
  assert.match(adr, /five weekly\s+contribution slots/);
  assert.match(adr, /Photos use a fixed three\n  second display duration/);
  assert.match(adr, /does not edit pixels, transcode, filter, or normalize audio/);
  assert.match(adr, /must not expose\n  a URI, thumbnail, image, player, or share action/);
  assert.match(decisionsReadme, /ADR-0003-local-media-and-vignette-contract\.md/);
  assert.match(backlog, /Media-contract amendment/);
  assert.match(backlog, /#45[\s\S]*block #14, #16, #22,\s*#24, and #46/);
  assert.match(backlog, /#46 — Capture a still image/);
});
