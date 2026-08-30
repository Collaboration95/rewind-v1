import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('camera routes consume capability ports instead of device APIs', () => {
  const route = readFileSync(join(appRoot, 'app', '(tabs)', 'camera.tsx'), 'utf8');
  const gate = readFileSync(
    join(appRoot, 'features', 'capture', 'CameraPermissionGate.tsx'),
    'utf8',
  );
  const state = readFileSync(
    join(appRoot, 'features', 'capture', 'camera-permission-state.ts'),
    'utf8',
  );
  const port = readFileSync(join(appRoot, 'platform', 'camera', 'permissions.ts'), 'utf8');
  const adapter = readFileSync(
    join(appRoot, 'platform', 'camera', 'expo-camera-permissions.ts'),
    'utf8',
  );

  assert.doesNotMatch(route, /from ['"]expo-camera['"]/);
  assert.doesNotMatch(gate, /from ['"]expo-camera['"]/);
  assert.doesNotMatch(state, /from ['"]expo-camera['"]/);
  assert.doesNotMatch(port, /expo-camera|expo-sqlite|react-native/);
  assert.match(adapter, /Camera\.getCameraPermissionsAsync/);
  assert.match(adapter, /Camera\.getMicrophonePermissionsAsync/);
  assert.match(adapter, /Linking\.openSettings/);
  assert.doesNotMatch(gate, /CameraView|record\s*\(/);
});

test('camera configuration documents iOS copy and Android video audio permission', () => {
  const config = JSON.parse(readFileSync(join(appRoot, 'app.json'), 'utf8'));
  const cameraPlugin = config.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-camera',
  );

  assert.ok(cameraPlugin, 'expo-camera config plugin exists');
  assert.equal(cameraPlugin[1].recordAudioAndroid, true);
  assert.match(cameraPlugin[1].cameraPermission, /camera.*local/i);
  assert.match(cameraPlugin[1].microphonePermission, /microphone.*local.*video/i);
});
