import type { CameraRecordingPort } from '../../platform/camera/recording';

import type { LocalVideoCaptureStore } from './local-video-capture-store';

export interface VideoCaptureDependencies {
  readonly camera: CameraRecordingPort;
  readonly store: LocalVideoCaptureStore;
}

export async function createLocalVideoCaptureDependencies(): Promise<VideoCaptureDependencies> {
  const [cameraAdapter, storeModule] = await Promise.all([
    import('../../platform/camera/expo-camera-recording'),
    import('./local-video-capture-store'),
  ]);

  return {
    camera: cameraAdapter.createExpoCameraRecordingPort(),
    store: await storeModule.createSqliteLocalVideoCaptureStore(),
  };
}
