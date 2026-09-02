import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../../components/FrameCard';
import { ScreenFrame } from '../../components/ScreenFrame';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, typography } from '../../components/tokens';
import { LocalGroupHome } from '../../features/group/LocalGroupHome';
import type { LocalHomeStore } from '../../features/group/local-home';
import { LocalProfileSwitcher } from '../../features/session/LocalProfileSwitcher';

export type HomeScreenProps = {
  homeStore?: LocalHomeStore;
};

export default function HomeScreen({ homeStore }: HomeScreenProps = {}) {
  return (
    <ScreenFrame contentContainerStyle={styles.content} testID="screen-home">
      <ScreenHeader statusTestID="home-local-status" testID="home-header" />

      <View style={styles.heroBlock}>
        <Text accessibilityRole="header" style={styles.title} testID="home-title">
          {'Hold onto\nthe week.'}
        </Text>
        <Text style={styles.lede}>A small time capsule for a local group.</Text>
      </View>

      <FrameCard
        accessibilityLabel="This is a local-only prototype. Synthetic profiles live on this device. There is no sign-in or sync in V1."
        accent={colors.flash}
        testID="home-local-only"
      >
        <Text style={styles.cardKicker}>THIS IS A LOCAL-ONLY PROTOTYPE</Text>
        <Text style={styles.cardBody}>
          Synthetic profiles live on this device. There is no sign-in or sync in V1.
        </Text>
      </FrameCard>

      <LocalGroupHome store={homeStore} />

      <LocalProfileSwitcher />

      <Link href="/settings" asChild>
        <Pressable
          accessibilityLabel="Open local reminder settings"
          accessibilityRole="button"
          style={({ pressed }) => [styles.settingsLink, pressed && styles.settingsLinkPressed]}
          testID="home-reminder-settings"
        >
          <Text style={styles.settingsLabel}>REMINDER SETTINGS</Text>
          <Text style={styles.settingsHint}>LOCAL DEVICE SCHEDULE + PERMISSION</Text>
        </Pressable>
      </Link>

      <View style={styles.footerNote}>
        <Text style={styles.footerLabel}>THE FIRST FRAME</Text>
        <Text style={styles.footerBody}>Chat and reveal arrive in the next slices.</Text>
        <View style={styles.footerLine} />
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  cardBody: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  cardKicker: {
    ...typography.label,
    color: colors.paper,
  },
  content: {
    justifyContent: 'space-between',
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
    marginTop: spacing.hero,
  },
  heroBlock: {
    gap: spacing.inset,
    marginTop: spacing.hero,
  },
  lede: {
    ...typography.body,
    color: colors.muted,
    maxWidth: 280,
  },
  settingsHint: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 10,
    marginTop: spacing.micro,
  },
  settingsLabel: {
    ...typography.label,
    color: colors.acid,
  },
  settingsLink: {
    borderColor: colors.line,
    borderWidth: 1,
    minHeight: 56,
    paddingHorizontal: spacing.inset,
    paddingVertical: spacing.compact,
  },
  settingsLinkPressed: {
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.display,
    color: colors.paper,
  },
});
