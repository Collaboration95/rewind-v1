import { CameraView } from 'expo-camera';
import { useEffect, useRef } from 'react';

import type { CameraPhotoCapturePort, CameraPhotoPreviewProps } from './still';

function ExpoCameraPhotoPreview({
  controllerRef,
  facing,
  onCameraReady,
  onMountError,
  style,
}: CameraPhotoPreviewProps) {
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    controllerRef.current = {
      takePictureAsync: async () => {
        const camera = cameraRef.current;
        if (!camera) {
          throw new Error('The camera preview is not ready');
        }

        const capture = await camera.takePictureAsync();
        return capture ? { uri: capture.uri } : undefined;
      },
    };

    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef]);

  return (
    <CameraView
      active
      facing={facing}
      mode="picture"
      onCameraReady={onCameraReady}
      onMountError={(event) => onMountError(event.message)}
      ref={cameraRef}
      style={style}
    />
  );
}

export function createExpoCameraPhotoCapturePort(): CameraPhotoCapturePort {
  return { Preview: ExpoCameraPhotoPreview };
}
