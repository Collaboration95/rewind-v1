import { RoutePlaceholder } from '../../components/RoutePlaceholder';
import { colors } from '../../components/tokens';

export default function CameraScreen() {
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
    />
  );
}
