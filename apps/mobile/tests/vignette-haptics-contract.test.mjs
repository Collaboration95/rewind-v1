import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(...parts) {
  return readFileSync(join(appRoot, ...parts), 'utf8');
}

test('capture treatments stay original, metadata-only, and accessible', () => {
  const route = read('app', '(tabs)', 'camera.tsx');
  const vignette = read('features', 'capture', 'vignette-treatments.tsx');
  const videoPanel = read('features', 'capture', 'VideoCapturePanel.tsx');
  const photoPanel = read('features', 'capture', 'PhotoCapturePanel.tsx');
  const reviewPanel = read('features', 'capture', 'ContributionReviewPanel.tsx');

  assert.match(route, /Vignette|haptics/i);
  assert.doesNotMatch(route, /from ['"]expo-haptics['"]/);
  for (const treatment of ['flash', 'ccd', 'home-movie', 'tape']) {
    assert.match(vignette, new RegExp(`value: ['"]${treatment}['"]`));
    assert.match(vignette, new RegExp(`vignette-option-`));
  }
  assert.match(vignette, /accessibilityLabel/);
  assert.match(vignette, /Presentation overlay only/);
  assert.match(vignette, /SOURCE PIXELS AND AUDIO UNCHANGED/);
  assert.match(vignette, /VignetteOverlay/);
  assert.doesNotMatch(vignette, /<Image|<Video|fetch\(|axios|https?:\/\//i);
  assert.match(videoPanel, /vignetteTreatment/);
  assert.match(photoPanel, /vignetteTreatment/);
  assert.match(reviewPanel, /review\.vignetteTreatment/);
});

test('haptic feedback stays behind a safe port and adapter', () => {
  const feedback = read('platform', 'haptics', 'feedback.ts');
  const adapter = read('platform', 'haptics', 'expo-haptics.ts');
  const videoDependencies = read('features', 'capture', 'video-capture-dependencies.ts');
  const photoDependencies = read('features', 'capture', 'photo-capture-dependencies.ts');
  const videoPanel = read('features', 'capture', 'VideoCapturePanel.tsx');
  const photoPanel = read('features', 'capture', 'PhotoCapturePanel.tsx');
  const reviewPanel = read('features', 'capture', 'ContributionReviewPanel.tsx');

  assert.match(feedback, /interface HapticsPort/);
  assert.match(feedback, /'locked'|"locked"/);
  assert.doesNotMatch(feedback, /expo-haptics/);
  assert.match(adapter, /from ['"]expo-haptics['"]/);
  assert.match(adapter, /catch/);
  assert.match(videoDependencies, /expo-haptics/);
  assert.match(photoDependencies, /expo-haptics/);
  assert.match(videoPanel, /triggerHaptic\(haptics, 'record'\)/);
  assert.match(videoPanel, /triggerHaptic\(haptics, 'stop'\)/);
  assert.match(photoPanel, /triggerHaptic\(haptics, 'record'\)/);
  assert.match(photoPanel, /triggerHaptic\(haptics, 'stop'\)/);
  assert.match(reviewPanel, /triggerHaptic\(haptics, 'locked'\)/);
  assert.match(reviewPanel, /\.catch\(\(\) => undefined\)/);
});
