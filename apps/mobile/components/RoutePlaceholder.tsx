import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FrameCard } from './FrameCard';
import { ScreenFrame } from './ScreenFrame';
import { ScreenHeader } from './ScreenHeader';
import { TabGlyph } from './TabGlyph';
import { colors, spacing, typography } from './tokens';
import type { TabGlyphName } from './tokens';

type RoutePlaceholderProps = {
  accent: ColorValue;
  cardBody: string;
  cardKicker: string;
  cardTestID: string;
  children?: ReactNode;
  description: string;
  glyph: TabGlyphName;
  screenTestID: string;
  title: string;
  titleTestID: string;
};

export function RoutePlaceholder({
  accent,
  cardBody,
  cardKicker,
  cardTestID,
  children,
  description,
  glyph,
  screenTestID,
  title,
  titleTestID,
}: RoutePlaceholderProps) {
  return (
    <ScreenFrame contentContainerStyle={styles.content} testID={screenTestID}>
      <ScreenHeader
        statusTestID={`${screenTestID}-local-status`}
        testID={`${screenTestID}-header`}
      />

      <View style={styles.heroBlock}>
        <View style={[styles.routeMark, { borderColor: accent }]} testID={`${screenTestID}-mark`}>
          <TabGlyph color={accent} focused name={glyph} />
        </View>
        <Text accessibilityRole="header" style={styles.title} testID={titleTestID}>
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {children ?? (
        <FrameCard
          accessibilityLabel={`${cardKicker}. ${cardBody}`}
          accent={accent}
          testID={cardTestID}
        >
          <Text style={[styles.cardKicker, { color: accent }]}>{cardKicker}</Text>
          <Text style={styles.cardBody}>{cardBody}</Text>
        </FrameCard>
      )}

      <View style={styles.footerNote}>
        <Text style={styles.footerLabel}>LOCAL DEMO ONLY</Text>
        <Text style={styles.footerBody}>This route is a frame in the first working shell.</Text>
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
  },
  content: {
    gap: spacing.section,
  },
  description: {
    ...typography.body,
    color: colors.muted,
    maxWidth: 300,
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
    paddingTop: spacing.hero,
  },
  routeMark: {
    alignItems: 'center',
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: {
    ...typography.title,
    color: colors.paper,
  },
});
