import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(...parts) {
  return readFileSync(join(appRoot, ...parts), 'utf8');
}

test('video capture keeps recording and file APIs behind platform ports', () => {
  const route = read('app', '(tabs)', 'camera.tsx');
  const panel = read('features', 'capture', 'VideoCapturePanel.tsx');
  const recordingPort = read('platform', 'camera', 'recording.ts');
  const recordingAdapter = read('platform', 'camera', 'expo-camera-recording.tsx');
  const filePort = read('platform', 'files', 'storage.ts');
  const fileAdapter = read('platform', 'files', 'expo-file-storage.ts');
  const sharedStore = read('features', 'capture', 'local-media-capture-store.ts');
  const packageJson = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8'));

  assert.doesNotMatch(route, /from ['"]expo-camera['"]/);
  assert.doesNotMatch(panel, /from ['"]expo-camera['"]/);
  assert.doesNotMatch(panel, /from ['"]expo-file-system['"]/);
  assert.doesNotMatch(recordingPort, /expo-camera|expo-file-system/);
  assert.doesNotMatch(filePort, /expo-camera|expo-file-system/);
  assert.match(recordingAdapter, /<CameraView/);
  assert.match(recordingAdapter, /recordAsync/);
  assert.match(recordingAdapter, /stopRecording/);
  assert.match(fileAdapter, /Paths\.document/);
  assert.match(fileAdapter, /\.copy\(/);
  assert.match(fileAdapter, /overwrite: true/);
  assert.match(panel, /MAX_VIDEO_DURATION_SECONDS/);
  assert.match(panel, /maxDurationSeconds/);
  assert.match(sharedStore, /validateCapture/);
  assert.match(sharedStore, /localUri: null/);
  assert.match(sharedStore, /files\.exists/);
  assert.match(sharedStore, /repository\.contributions\.save/);
  assert.match(sharedStore, /repository\.audit\.append/);
  assert.ok(packageJson.dependencies['expo-file-system']);
});
