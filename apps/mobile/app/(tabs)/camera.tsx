import { useCallback, useState } from 'react';
import type { CameraCapabilityPort } from '../../platform/camera/permissions';

import { RoutePlaceholder } from '../../components/RoutePlaceholder';
import { colors } from '../../components/tokens';
import { CameraPermissionGate } from '../../features/capture/CameraPermissionGate';
import { ContributionReviewPanel } from '../../features/capture/ContributionReviewPanel';
import { PhotoCapturePanel } from '../../features/capture/PhotoCapturePanel';
import { VideoCapturePanel } from '../../features/capture/VideoCapturePanel';
import type { PhotoCaptureDependencies } from '../../features/capture/photo-capture-dependencies';
import type { VideoCaptureDependencies } from '../../features/capture/video-capture-dependencies';
import type { CameraMediaKind } from '../../features/capture/camera-permission-state';
import type { LocalContributionReviewStore } from '../../features/capture/local-contribution-review-store';

export type CameraScreenProps = {
  capabilities?: CameraCapabilityPort;
  captureDependencies?: VideoCaptureDependencies;
  mediaKind?: CameraMediaKind;
  photoCaptureDependencies?: PhotoCaptureDependencies;
  reviewStore?: LocalContributionReviewStore;
  showCapture?: boolean;
  showMediaKindPicker?: boolean;
};

export default function CameraScreen({
  capabilities,
  captureDependencies,
  mediaKind = 'video',
  photoCaptureDependencies,
  reviewStore,
  showCapture = true,
  showMediaKindPicker = true,
}: CameraScreenProps = {}) {
  const [reviewRefreshToken, setReviewRefreshToken] = useState(0);
  const handleContributionSaved = useCallback(() => {
    setReviewRefreshToken((current) => current + 1);
  }, []);
  const reviewEnabled =
    showCapture &&
    (reviewStore !== undefined ||
      (captureDependencies === undefined && photoCaptureDependencies === undefined));

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
                  <VideoCapturePanel
                    dependencies={captureDependencies}
                    onContributionSaved={handleContributionSaved}
                  />
                ) : (
                  <PhotoCapturePanel
                    dependencies={photoCaptureDependencies}
                    onContributionSaved={handleContributionSaved}
                  />
                )
            : undefined
        }
        showMediaKindPicker={showMediaKindPicker}
      />
      {reviewEnabled ? (
        <ContributionReviewPanel refreshToken={reviewRefreshToken} store={reviewStore} />
      ) : null}
    </RoutePlaceholder>
  );
}
