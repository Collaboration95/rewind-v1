import type { CameraRecordingPort } from '../../platform/camera/recording';
import type { HapticsPort } from '../../platform/haptics/feedback';

import type { LocalVideoCaptureStore } from './local-video-capture-store';

export interface VideoCaptureDependencies {
  readonly camera: CameraRecordingPort;
  readonly haptics?: HapticsPort;
  readonly store: LocalVideoCaptureStore;
}

export async function createLocalVideoCaptureDependencies(): Promise<VideoCaptureDependencies> {
  const [cameraAdapter, storeModule] = await Promise.all([
    import('../../platform/camera/expo-camera-recording'),
    import('./local-video-capture-store'),
  ]);
  const haptics = await import('../../platform/haptics/expo-haptics')
    .then(({ createExpoHapticsPort }) => createExpoHapticsPort())
    .catch(() => undefined);

  return {
    camera: cameraAdapter.createExpoCameraRecordingPort(),
    haptics,
    store: await storeModule.createSqliteLocalVideoCaptureStore(),
  };
}
