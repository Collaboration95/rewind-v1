import type { CameraCapabilityPort } from '../../platform/camera/permissions';

import { RoutePlaceholder } from '../../components/RoutePlaceholder';
import { colors } from '../../components/tokens';
import { CameraPermissionGate } from '../../features/capture/CameraPermissionGate';

export type CameraScreenProps = {
  capabilities?: CameraCapabilityPort;
};

export default function CameraScreen({ capabilities }: CameraScreenProps = {}) {
  return (
    <RoutePlaceholder
      accent={colors.flash}
      cardBody="The local camera, presets, and fifteen-second capture flow arrive in the next slice."
      cardKicker="CAMERA / NEXT FRAME"
      cardTestID="camera-placeholder"
      description="A quiet capture surface for the moments worth holding."
      glyph="camera"
      screenTestID="screen-camera"
      title={'Make a\nframe.'}
      titleTestID="camera-title"
    >
      <CameraPermissionGate capabilities={capabilities} />
    </RoutePlaceholder>
  );
}
