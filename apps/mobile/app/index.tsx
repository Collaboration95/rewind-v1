import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const palette = {
  background: '#0B1114',
  surface: '#121A1D',
  line: '#29373B',
  text: '#F4EFE6',
  muted: '#A6B0AC',
  acid: '#D7F45B',
  orange: '#FF7A4D',
} as const;

export default function HomeScreen() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea} testID="screen-home">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>REWIND / V1</Text>
          <View
            accessible
            accessibilityLabel="Local only status"
            style={styles.statusMark}
            testID="home-local-status"
          >
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>LOCAL ONLY</Text>
          </View>
        </View>

        <View style={styles.heroBlock}>
          <Text accessibilityRole="header" style={styles.title} testID="home-title">
            {'Hold onto\nthe week.'}
          </Text>
          <Text style={styles.lede}>A small time capsule for a local group.</Text>
        </View>

        <View
          accessible
          accessibilityLabel="This is a local-only prototype. Synthetic profiles live on this device. There is no sign-in or sync in V1."
          style={styles.noteCard}
          testID="home-local-only"
        >
          <View style={styles.cardRule} />
          <View style={styles.cardCopy}>
            <Text style={styles.cardKicker}>THIS IS A LOCAL-ONLY PROTOTYPE</Text>
            <Text style={styles.cardBody}>
              Synthetic profiles live on this device. There is no sign-in or sync in V1.
            </Text>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerLabel}>THE FIRST FRAME</Text>
          <Text style={styles.footerBody}>
            Capture, chat, and reveal arrive in the next slices.
          </Text>
          <View style={styles.footerLine} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  statusMark: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  statusDot: {
    backgroundColor: palette.acid,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusText: {
    color: palette.acid,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  heroBlock: {
    gap: 18,
    marginTop: 96,
  },
  title: {
    color: palette.text,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.8,
    lineHeight: 49,
  },
  lede: {
    color: palette.muted,
    fontSize: 18,
    lineHeight: 26,
    maxWidth: 260,
  },
  noteCard: {
    alignItems: 'stretch',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 58,
    minHeight: 128,
    padding: 18,
  },
  cardRule: {
    backgroundColor: palette.orange,
    marginRight: 16,
    width: 3,
  },
  cardCopy: {
    flex: 1,
    gap: 9,
    justifyContent: 'center',
  },
  cardKicker: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardBody: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  footerNote: {
    marginTop: 52,
  },
  footerLabel: {
    color: palette.acid,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  footerBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  footerLine: {
    backgroundColor: palette.line,
    height: 1,
    marginTop: 24,
    width: '100%',
  },
});
