import type { ComponentType, MutableRefObject } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type CameraFacing = 'back' | 'front';

export interface CameraVideoCapture {
  readonly durationSeconds?: number;
  readonly uri: string;
}

export interface CameraRecordingOptions {
  readonly maxDurationSeconds?: number;
}

export interface CameraRecordingController {
  recordAsync(options?: CameraRecordingOptions): Promise<CameraVideoCapture | undefined>;
  stopRecording(): void;
}

export interface CameraPreviewProps {
  readonly controllerRef: MutableRefObject<CameraRecordingController | null>;
  readonly facing: CameraFacing;
  readonly onCameraReady: () => void;
  readonly onMountError: (message: string) => void;
  readonly style?: StyleProp<ViewStyle>;
}

export interface CameraRecordingPort {
  readonly Preview: ComponentType<CameraPreviewProps>;
}
