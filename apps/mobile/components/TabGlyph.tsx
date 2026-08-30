import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { navigation, type TabGlyphName } from './tokens';

type TabGlyphProps = {
  color: ColorValue;
  focused: boolean;
  name: TabGlyphName;
};

export function TabGlyph({ color, focused, name }: TabGlyphProps) {
  const stroke = { borderColor: color };
  const fill = { backgroundColor: color };

  return (
    <View accessible={false} style={[styles.canvas, focused && styles.focused]}>
      {focused ? (
        <View
          style={[
            styles.activeIndicator,
            { backgroundColor: color, height: navigation.activeIndicatorHeight },
          ]}
        />
      ) : null}
      {name === 'home' ? (
        <View style={[styles.homeFrame, stroke]}>
          <View style={[styles.homeDoor, fill]} />
        </View>
      ) : null}
      {name === 'camera' ? (
        <View style={[styles.cameraRing, stroke]}>
          <View style={[styles.cameraLens, fill]} />
        </View>
      ) : null}
      {name === 'chat' ? (
        <View style={[styles.chatFrame, stroke]}>
          <View style={[styles.chatTail, stroke]} />
          <View style={[styles.chatDot, fill]} />
        </View>
      ) : null}
      {name === 'archive' ? (
        <View style={styles.archiveStack}>
          <View style={[styles.archiveFrame, stroke]} />
          <View style={[styles.archiveFrame, styles.archiveFrameBack, stroke]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  archiveFrame: {
    borderWidth: 1.5,
    height: 15,
    position: 'absolute',
    width: 19,
  },
  archiveFrameBack: {
    left: 3,
    top: 4,
  },
  archiveStack: {
    height: 22,
    position: 'relative',
    width: 24,
  },
  activeIndicator: {
    left: 0,
    position: 'absolute',
    top: -5,
    width: 24,
  },
  cameraLens: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  cameraRing: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  canvas: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  chatDot: {
    borderRadius: 2,
    bottom: 6,
    height: 4,
    left: 7,
    position: 'absolute',
    width: 4,
  },
  chatFrame: {
    borderRadius: 4,
    borderWidth: 1.5,
    height: 17,
    position: 'relative',
    width: 22,
  },
  chatTail: {
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    bottom: -4,
    height: 6,
    left: 3,
    position: 'absolute',
    transform: [{ rotate: '-35deg' }],
    width: 6,
  },
  focused: {
    transform: [{ scale: 1.05 }],
  },
  homeDoor: {
    bottom: 3,
    height: 7,
    left: 7,
    position: 'absolute',
    width: 2,
  },
  homeFrame: {
    borderWidth: 1.5,
    height: 18,
    position: 'relative',
    width: 18,
  },
});
