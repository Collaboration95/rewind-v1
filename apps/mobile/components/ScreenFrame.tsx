import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from './tokens';

type ScreenFrameProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID: string;
};

export function ScreenFrame({ children, contentContainerStyle, testID }: ScreenFrameProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea} testID={testID}>
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.ink,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.hero,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.inset,
  },
});
