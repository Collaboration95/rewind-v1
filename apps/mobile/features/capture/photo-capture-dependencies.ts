import type { CameraPhotoCapturePort } from '../../platform/camera/still';

import type { LocalPhotoCaptureStore } from './local-photo-capture-store';

export interface PhotoCaptureDependencies {
  readonly camera: CameraPhotoCapturePort;
  readonly store: LocalPhotoCaptureStore;
}

export async function createLocalPhotoCaptureDependencies(): Promise<PhotoCaptureDependencies> {
  const [cameraAdapter, storeModule] = await Promise.all([
    import('../../platform/camera/expo-camera-still'),
    import('./local-photo-capture-store'),
  ]);

  return {
    camera: cameraAdapter.createExpoCameraPhotoCapturePort(),
    store: await storeModule.createSqliteLocalPhotoCaptureStore(),
  };
}
