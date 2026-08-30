import { StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../../components/FrameCard';
import { ScreenFrame } from '../../components/ScreenFrame';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing, typography } from '../../components/tokens';

export default function HomeScreen() {
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

      <View style={styles.footerNote}>
        <Text style={styles.footerLabel}>THE FIRST FRAME</Text>
        <Text style={styles.footerBody}>Capture, chat, and reveal arrive in the next slices.</Text>
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
  title: {
    ...typography.display,
    color: colors.paper,
  },
});
