import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenFrame } from '../components/ScreenFrame';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing, typography } from '../components/tokens';
import {
  LocalReminderPanel,
  type LocalReminderPanelProps,
} from '../features/reminders/LocalReminderPanel';

export type SettingsScreenProps = {
  reminderStore?: LocalReminderPanelProps['store'];
};

export default function SettingsScreen({ reminderStore }: SettingsScreenProps = {}) {
  return (
    <ScreenFrame contentContainerStyle={styles.content} testID="screen-settings">
      <ScreenHeader statusTestID="settings-local-status" testID="settings-header" />

      <View style={styles.navigationRow}>
        <Link href="/(tabs)" asChild>
          <Pressable
            accessibilityLabel="Back to Home"
            accessibilityRole="button"
            style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
            testID="settings-back-home"
          >
            <Text style={styles.backLabel}>← HOME</Text>
          </Pressable>
        </Link>
        <Text style={styles.routeLabel}>DEVICE SETTINGS</Text>
      </View>

      <View style={styles.heroBlock}>
        <Text accessibilityRole="header" style={styles.title} testID="settings-title">
          Keep it
          {'\n'}close.
        </Text>
        <Text style={styles.description}>
          Change what this device remembers about your week. Nothing here sends data to your group.
        </Text>
      </View>

      <LocalReminderPanel store={reminderStore} />

      <View style={styles.footerNote}>
        <Text style={styles.footerLabel}>LOCAL DEMO ONLY</Text>
        <Text style={styles.footerBody}>
          Device reset and notification history arrive in later slices.
        </Text>
        <View style={styles.footerLine} />
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  backLabel: {
    ...typography.utility,
    color: colors.paper,
  },
  backLink: {
    justifyContent: 'center',
    minHeight: 44,
    paddingRight: spacing.inset,
  },
  content: {
    gap: spacing.section,
  },
  description: {
    ...typography.body,
    color: colors.muted,
    maxWidth: 320,
  },
  footerBody: {
    ...typography.bodySmall,
    color: colors.muted,
    marginTop: spacing.micro,
  },
  footerLabel: {
    ...typography.utility,
    color: colors.acid,
  },
  footerLine: {
    backgroundColor: colors.line,
    height: spacing.hairline,
    marginTop: spacing.inset,
    width: '100%',
  },
  footerNote: {
    marginTop: 'auto',
  },
  heroBlock: {
    gap: spacing.inset,
    paddingTop: spacing.compact,
  },
  navigationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.7,
  },
  routeLabel: {
    ...typography.utility,
    color: colors.muted,
  },
  title: {
    ...typography.title,
    color: colors.paper,
  },
});
