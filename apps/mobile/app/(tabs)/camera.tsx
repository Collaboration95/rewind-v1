import type { CameraCapabilityPort } from '../../platform/camera/permissions';

import { RoutePlaceholder } from '../../components/RoutePlaceholder';
import { colors } from '../../components/tokens';
import { CameraPermissionGate } from '../../features/capture/CameraPermissionGate';
import { PhotoCapturePanel } from '../../features/capture/PhotoCapturePanel';
import { VideoCapturePanel } from '../../features/capture/VideoCapturePanel';
import type { PhotoCaptureDependencies } from '../../features/capture/photo-capture-dependencies';
import type { VideoCaptureDependencies } from '../../features/capture/video-capture-dependencies';
import type { CameraMediaKind } from '../../features/capture/camera-permission-state';

export type CameraScreenProps = {
  capabilities?: CameraCapabilityPort;
  captureDependencies?: VideoCaptureDependencies;
  mediaKind?: CameraMediaKind;
  photoCaptureDependencies?: PhotoCaptureDependencies;
  showCapture?: boolean;
  showMediaKindPicker?: boolean;
};

export default function CameraScreen({
  capabilities,
  captureDependencies,
  mediaKind = 'video',
  photoCaptureDependencies,
  showCapture = true,
  showMediaKindPicker = true,
}: CameraScreenProps = {}) {
  return (
    <RoutePlaceholder
      accent={colors.flash}
      cardBody="Capture a still image or short vertical video and keep its local file on this device."
      cardKicker="CAMERA / LOCAL CAPTURE"
      cardTestID="camera-placeholder"
      description="A quiet capture surface for the moments worth holding."
      glyph="camera"
      screenTestID="screen-camera"
      title={'Make a\nframe.'}
      titleTestID="camera-title"
    >
      <CameraPermissionGate
        capabilities={capabilities}
        initialMediaKind={mediaKind}
        renderReady={
          showCapture
            ? (selectedMediaKind) =>
                selectedMediaKind === 'video' ? (
                  <VideoCapturePanel dependencies={captureDependencies} />
                ) : (
                  <PhotoCapturePanel dependencies={photoCaptureDependencies} />
                )
            : undefined
        }
        showMediaKindPicker={showMediaKindPicker}
      />
    </RoutePlaceholder>
  );
}
