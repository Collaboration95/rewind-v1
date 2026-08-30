import type { CameraCapabilityPort } from '../../platform/camera/permissions';

import { RoutePlaceholder } from '../../components/RoutePlaceholder';
import { colors } from '../../components/tokens';
import { CameraPermissionGate } from '../../features/capture/CameraPermissionGate';
import { VideoCapturePanel } from '../../features/capture/VideoCapturePanel';
import type { VideoCaptureDependencies } from '../../features/capture/video-capture-dependencies';
import type { CameraMediaKind } from '../../features/capture/camera-permission-state';

export type CameraScreenProps = {
  capabilities?: CameraCapabilityPort;
  captureDependencies?: VideoCaptureDependencies;
  mediaKind?: CameraMediaKind;
  showCapture?: boolean;
};

export default function CameraScreen({
  capabilities,
  captureDependencies,
  mediaKind = 'video',
  showCapture = true,
}: CameraScreenProps = {}) {
  return (
    <RoutePlaceholder
      accent={colors.flash}
      cardBody="Record one short vertical video and keep its local file on this device."
      cardKicker="CAMERA / LOCAL VIDEO"
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
                ) : undefined
            : undefined
        }
        showMediaKindPicker={!showCapture}
      />
    </RoutePlaceholder>
  );
}
