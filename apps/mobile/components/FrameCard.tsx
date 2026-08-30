import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from './tokens';

type FrameCardProps = {
  accessibilityLabel: string;
  accent: ColorValue;
  accessible?: boolean;
  children: ReactNode;
  testID: string;
};

export function FrameCard({
  accessibilityLabel,
  accent,
  accessible = true,
  children,
  testID,
}: FrameCardProps) {
  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={styles.card}
      testID={testID}
    >
      <View style={[styles.rule, { backgroundColor: accent }]} />
      <View style={styles.copy}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 128,
    padding: spacing.inset,
  },
  copy: {
    flex: 1,
    gap: spacing.micro,
    justifyContent: 'center',
  },
  rule: {
    marginRight: spacing.inset,
    width: 3,
  },
});
