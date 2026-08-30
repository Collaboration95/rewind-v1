import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { VignetteTreatment } from '../../../../packages/domain/src/models';

import { colors, radii, spacing, typography } from '../../components/tokens';

export interface VignetteTreatmentOption {
  readonly description: string;
  readonly label: string;
  readonly value: VignetteTreatment;
}

export const VIGNETTE_TREATMENT_OPTIONS: readonly VignetteTreatmentOption[] = [
  {
    description: 'Bright corner marks',
    label: 'Flash',
    value: 'flash',
  },
  {
    description: 'Fine horizontal rules',
    label: 'CCD',
    value: 'ccd',
  },
  {
    description: 'Soft frame window',
    label: 'Home Movie',
    value: 'home-movie',
  },
  {
    description: 'Offset registration marks',
    label: 'Tape',
    value: 'tape',
  },
];

export function VignetteTreatmentPicker({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: VignetteTreatment) => void;
  value: VignetteTreatment;
}) {
  const selected = getVignetteTreatmentOption(value);

  return (
    <View style={styles.picker} testID="vignette-picker">
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>FRAME TREATMENT</Text>
        <Text style={styles.selection} testID="vignette-selection">
          {selected.label.toUpperCase()}
        </Text>
      </View>
      <View style={styles.options}>
        {VIGNETTE_TREATMENT_OPTIONS.map((option) => (
          <Pressable
            accessibilityLabel={`Choose ${option.label} vignette: ${option.description}. Presentation overlay only.`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: option.value === value }}
            disabled={disabled}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              option.value === value && styles.optionSelected,
              pressed && styles.pressed,
              disabled && styles.disabled,
            ]}
            testID={`vignette-option-${option.value}`}
          >
            <VignetteSwatch treatment={option.value} />
            <Text
              style={[styles.optionLabel, option.value === value && styles.optionLabelSelected]}
            >
              {option.label.toUpperCase()}
            </Text>
            <Text
              style={[
                styles.optionDescription,
                option.value === value && styles.optionSelectedDescription,
              ]}
            >
              {option.description}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.disclosure}>
        ORIGINAL FRAME OVERLAY · SOURCE PIXELS AND AUDIO UNCHANGED
      </Text>
    </View>
  );
}

export function VignetteOverlay({
  testID,
  treatment,
}: {
  testID?: string;
  treatment: VignetteTreatment;
}) {
  return (
    <View accessible={false} pointerEvents="none" style={styles.overlay} testID={testID}>
      {treatment === 'flash' ? <FlashMarks /> : null}
      {treatment === 'ccd' ? <CcdRules /> : null}
      {treatment === 'home-movie' ? <HomeMovieFrame /> : null}
      {treatment === 'tape' ? <TapeMarks /> : null}
      <View style={styles.overlayLabel}>
        <Text style={styles.overlayLabelText}>{getVignetteTreatmentOption(treatment).label}</Text>
        <Text style={styles.overlayLabelNote}>FRAME / METADATA</Text>
      </View>
    </View>
  );
}

export function getVignetteTreatmentOption(treatment: VignetteTreatment): VignetteTreatmentOption {
  return (
    VIGNETTE_TREATMENT_OPTIONS.find((option) => option.value === treatment) ??
    VIGNETTE_TREATMENT_OPTIONS[0]!
  );
}

function VignetteSwatch({ treatment }: { treatment: VignetteTreatment }) {
  return (
    <View style={styles.swatch}>
      <VignetteOverlay treatment={treatment} />
    </View>
  );
}

function FlashMarks() {
  return (
    <View style={styles.fullOverlay}>
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />
    </View>
  );
}

function CcdRules() {
  return (
    <View style={styles.fullOverlay}>
      {[0, 1, 2, 3, 4].map((index) => (
        <View key={index} style={[styles.rule, { top: `${18 + index * 15}%` }]} />
      ))}
    </View>
  );
}

function HomeMovieFrame() {
  return (
    <View style={styles.fullOverlay}>
      <View style={styles.homeMovieTop} />
      <View style={styles.homeMovieBottom} />
      <View style={styles.homeMovieDot} />
    </View>
  );
}

function TapeMarks() {
  return (
    <View style={styles.fullOverlay}>
      <View style={[styles.tapeMark, styles.tapeMarkTop]} />
      <View style={[styles.tapeMark, styles.tapeMarkBottom]} />
      <View style={styles.tapeOffset} />
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    borderColor: colors.acid,
    height: 18,
    position: 'absolute',
    width: 18,
  },
  cornerBottomLeft: {
    borderRightWidth: 1,
    borderTopWidth: 1,
    bottom: 12,
    left: 12,
  },
  cornerBottomRight: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    bottom: 12,
    right: 12,
  },
  cornerTopLeft: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    left: 12,
    top: 12,
  },
  cornerTopRight: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    right: 12,
    top: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  disclosure: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1.05,
  },
  fullOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  homeMovieBottom: {
    backgroundColor: colors.ink,
    bottom: 0,
    height: 18,
    left: 0,
    opacity: 0.72,
    position: 'absolute',
    right: 0,
  },
  homeMovieDot: {
    backgroundColor: colors.flash,
    borderRadius: radii.pill,
    height: 5,
    position: 'absolute',
    right: 12,
    top: 12,
    width: 5,
  },
  homeMovieTop: {
    backgroundColor: colors.ink,
    height: 18,
    left: 0,
    opacity: 0.72,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  option: {
    alignItems: 'flex-start',
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    gap: spacing.micro,
    minHeight: 112,
    padding: spacing.compact,
  },
  optionLabel: {
    ...typography.utility,
    color: colors.paper,
    fontSize: 10,
  },
  optionLabelSelected: {
    color: colors.ink,
  },
  optionSelected: {
    backgroundColor: colors.acid,
    borderColor: colors.acid,
  },
  optionDescription: {
    ...typography.bodySmall,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.compact,
  },
  optionSelectedDescription: {
    color: colors.ink,
  },
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  overlayLabel: {
    bottom: 10,
    left: 10,
    position: 'absolute',
  },
  overlayLabelNote: {
    ...typography.utility,
    color: colors.paper,
    fontSize: 7,
    letterSpacing: 0.8,
    opacity: 0.85,
  },
  overlayLabelText: {
    ...typography.label,
    color: colors.paper,
    fontSize: 10,
  },
  picker: {
    gap: spacing.compact,
  },
  pressed: {
    opacity: 0.72,
  },
  rule: {
    backgroundColor: colors.paper,
    height: 1,
    opacity: 0.56,
    position: 'absolute',
    width: '100%',
  },
  selection: {
    ...typography.utility,
    color: colors.acid,
    fontSize: 10,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.paper,
  },
  swatch: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderWidth: 1,
    height: 38,
    overflow: 'hidden',
    width: '100%',
  },
  tapeMark: {
    borderColor: colors.flash,
    borderWidth: 1,
    height: 8,
    left: 10,
    position: 'absolute',
    right: 10,
  },
  tapeMarkBottom: {
    bottom: 15,
  },
  tapeMarkTop: {
    top: 15,
  },
  tapeOffset: {
    borderColor: colors.acid,
    borderLeftWidth: 1,
    bottom: 8,
    position: 'absolute',
    right: 18,
    top: 8,
    width: 12,
  },
});
