import { Camera, PermissionStatus, type PermissionResponse } from 'expo-camera';
import { Linking } from 'react-native';

import type {
  CapabilityPermissionSnapshot,
  CameraCapabilityPort,
  PermissionPort,
} from './permissions';

const unsupported: CapabilityPermissionSnapshot = {
  canAskAgain: false,
  status: 'unsupported',
};

function mapPermission(response: PermissionResponse): CapabilityPermissionSnapshot {
  if (response.granted || response.status === PermissionStatus.GRANTED) {
    return { canAskAgain: false, status: 'granted' };
  }

  if (response.status === PermissionStatus.UNDETERMINED) {
    return { canAskAgain: true, status: 'undetermined' };
  }

  if (response.status === PermissionStatus.DENIED) {
    return {
      canAskAgain: response.canAskAgain,
      status: response.canAskAgain ? 'denied' : 'blocked',
    };
  }

  return unsupported;
}

function createPermissionPort(
  check: () => Promise<PermissionResponse>,
  request: () => Promise<PermissionResponse>,
): PermissionPort {
  return {
    async check() {
      try {
        return mapPermission(await check());
      } catch {
        return unsupported;
      }
    },
    async request() {
      try {
        return mapPermission(await request());
      } catch {
        return unsupported;
      }
    },
  };
}

export function createExpoCameraCapabilityPort(): CameraCapabilityPort {
  return {
    camera: createPermissionPort(
      () => Camera.getCameraPermissionsAsync(),
      () => Camera.requestCameraPermissionsAsync(),
    ),
    microphone: createPermissionPort(
      () => Camera.getMicrophonePermissionsAsync(),
      () => Camera.requestMicrophonePermissionsAsync(),
    ),
    settings: {
      open: () => Linking.openSettings(),
    },
  };
}
