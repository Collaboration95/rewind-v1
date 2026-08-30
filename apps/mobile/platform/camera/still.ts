import type { ComponentType, MutableRefObject } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface CameraPhotoCapture {
  readonly uri: string;
}

export interface CameraPhotoCaptureController {
  takePictureAsync(): Promise<CameraPhotoCapture | undefined>;
}

export interface CameraPhotoPreviewProps {
  readonly controllerRef: MutableRefObject<CameraPhotoCaptureController | null>;
  readonly facing: 'back' | 'front';
  readonly onCameraReady: () => void;
  readonly onMountError: (message: string) => void;
  readonly style?: StyleProp<ViewStyle>;
}

export interface CameraPhotoCapturePort {
  readonly Preview: ComponentType<CameraPhotoPreviewProps>;
}
