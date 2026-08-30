import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(...parts) {
  return readFileSync(join(appRoot, ...parts), 'utf8');
}

test('still capture stays behind camera and local-media ports', () => {
  const route = read('app', '(tabs)', 'camera.tsx');
  const panel = read('features', 'capture', 'PhotoCapturePanel.tsx');
  const dependencies = read('features', 'capture', 'photo-capture-dependencies.ts');
  const photoPort = read('platform', 'camera', 'still.ts');
  const photoAdapter = read('platform', 'camera', 'expo-camera-still.tsx');
  const store = read('features', 'capture', 'local-photo-capture-store.ts');
  const sharedStore = read('features', 'capture', 'local-media-capture-store.ts');

  assert.doesNotMatch(route, /from ['"]expo-camera['"]/);
  assert.doesNotMatch(panel, /from ['"]expo-camera['"]/);
  assert.doesNotMatch(panel, /from ['"]expo-file-system['"]/);
  assert.doesNotMatch(dependencies, /from ['"]expo-camera['"]/);
  assert.doesNotMatch(photoPort, /expo-camera|expo-file-system/);
  assert.match(photoAdapter, /<CameraView/);
  assert.match(photoAdapter, /takePictureAsync/);
  assert.match(photoAdapter, /mode="picture"/);
  assert.match(panel, /PHOTO_DURATION_SECONDS/);
  assert.match(panel, /takePictureAsync/);
  assert.doesNotMatch(panel, /<Image/);
  assert.match(store, /mediaKind: 'photo'/);
  assert.match(sharedStore, /localUri: null/);
  assert.match(sharedStore, /files\.exists/);
});
