import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from './tokens';

type ScreenHeaderProps = {
  statusTestID?: string;
  testID: string;
};

export function ScreenHeader({ statusTestID, testID }: ScreenHeaderProps) {
  return (
    <View style={styles.headerRow} testID={testID}>
      <Text style={styles.eyebrow}>REWIND / V1</Text>
      <View
        accessible
        accessibilityLabel="Local-only prototype"
        style={styles.statusMark}
        testID={statusTestID}
      >
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>LOCAL ONLY</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.micro,
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...typography.label,
    color: colors.muted,
    flexShrink: 1,
    letterSpacing: 2.2,
  },
  statusMark: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.micro,
  },
  statusDot: {
    backgroundColor: colors.acid,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusText: {
    ...typography.utility,
    color: colors.acid,
    letterSpacing: 1.4,
  },
});
