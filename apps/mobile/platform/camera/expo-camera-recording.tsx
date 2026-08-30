import { CameraView } from 'expo-camera';
import { useEffect, useRef } from 'react';

import type { CameraRecordingOptions, CameraRecordingPort, CameraPreviewProps } from './recording';

function ExpoCameraPreview({
  controllerRef,
  facing,
  onCameraReady,
  onMountError,
  style,
}: CameraPreviewProps) {
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    controllerRef.current = {
      recordAsync: async (options?: CameraRecordingOptions) => {
        const camera = cameraRef.current;
        if (!camera) {
          throw new Error('The camera preview is not ready');
        }

        const capture = await camera.recordAsync(
          options?.maxDurationSeconds === undefined
            ? undefined
            : { maxDuration: options.maxDurationSeconds },
        );
        return capture ? { uri: capture.uri } : undefined;
      },
      stopRecording: () => {
        cameraRef.current?.stopRecording();
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
      mode="video"
      mute={false}
      onCameraReady={onCameraReady}
      onMountError={(event) => onMountError(event.message)}
      ref={cameraRef}
      style={style}
    />
  );
}

export function createExpoCameraRecordingPort(): CameraRecordingPort {
  return { Preview: ExpoCameraPreview };
}
