import type { CameraPhotoCapturePort } from '../../platform/camera/still';
import type { HapticsPort } from '../../platform/haptics/feedback';

import type { LocalPhotoCaptureStore } from './local-photo-capture-store';

export interface PhotoCaptureDependencies {
  readonly camera: CameraPhotoCapturePort;
  readonly haptics?: HapticsPort;
  readonly store: LocalPhotoCaptureStore;
}

export async function createLocalPhotoCaptureDependencies(): Promise<PhotoCaptureDependencies> {
  const [cameraAdapter, storeModule] = await Promise.all([
    import('../../platform/camera/expo-camera-still'),
    import('./local-photo-capture-store'),
  ]);
  const haptics = await import('../../platform/haptics/expo-haptics')
    .then(({ createExpoHapticsPort }) => createExpoHapticsPort())
    .catch(() => undefined);

  return {
    camera: cameraAdapter.createExpoCameraPhotoCapturePort(),
    haptics,
    store: await storeModule.createSqliteLocalPhotoCaptureStore(),
  };
}
