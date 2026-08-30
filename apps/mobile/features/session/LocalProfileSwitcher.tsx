import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../components/tokens';
import { useLocalSession } from './LocalSessionProvider';

export function LocalProfileSwitcher() {
  const { activeMember, error, members, pendingMemberId, retry, selectMember, status } =
    useLocalSession();

  return (
    <View style={styles.card} testID="home-profile-switcher">
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>LOCAL PROFILE</Text>
        <Text style={styles.mode}>SIMULATED ACTOR</Text>
      </View>
      <View
        accessible
        accessibilityLabel={
          activeMember
            ? `Current local profile: ${activeMember.displayName}`
            : 'Current local profile is loading'
        }
        style={styles.currentBlock}
        testID="profile-current"
      >
        <Text style={styles.currentLabel}>ACTING AS</Text>
        <Text style={styles.currentName}>{activeMember?.displayName ?? '—'}</Text>
      </View>
      <Text style={styles.description}>
        Switch the simulated actor used by local demo commands on this device.
      </Text>

      {status === 'loading' ? (
        <Text style={styles.status} testID="profile-loading">
          RESTORING LOCAL PROFILES…
        </Text>
      ) : status === 'error' ? (
        <View style={styles.errorBlock}>
          <Text accessibilityRole="alert" style={styles.errorText} testID="profile-error">
            {error}
          </Text>
          <Pressable
            accessibilityLabel="Retry local profile restore"
            accessibilityRole="button"
            onPress={retry}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            testID="profile-retry"
          >
            <Text style={styles.retryLabel}>TRY AGAIN</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.options}>
          {members.map((member) => {
            const selected = member.id === activeMember?.id;
            const disabled = pendingMemberId !== null;
            return (
              <Pressable
                accessibilityLabel={`Switch local profile to ${member.displayName}`}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
                key={member.id}
                onPress={() => {
                  void selectMember(member.id);
                }}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.pressed,
                  disabled && styles.optionDisabled,
                ]}
                testID={`profile-option-${member.id}`}
              >
                <Text style={[styles.optionName, selected && styles.optionNameSelected]}>
                  {member.displayName}
                </Text>
                <Text style={[styles.optionMark, selected && styles.optionMarkSelected]}>
                  {selected ? 'CURRENT' : 'SELECT'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {status === 'ready' && error ? (
        <Text accessibilityRole="alert" style={styles.errorText} testID="profile-selection-error">
          {error}
        </Text>
      ) : null}
      <Text style={styles.disclosure}>LOCAL DEMO ONLY · NO SIGN-IN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    gap: spacing.compact,
    padding: spacing.inset,
  },
  currentBlock: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: spacing.micro,
    paddingBottom: spacing.inset,
  },
  currentLabel: {
    ...typography.utility,
    color: colors.muted,
  },
  currentName: {
    ...typography.title,
    color: colors.paper,
  },
  description: {
    ...typography.bodySmall,
    color: colors.muted,
  },
  disclosure: {
    ...typography.utility,
    color: colors.acid,
    letterSpacing: 1.2,
    marginTop: spacing.micro,
  },
  errorBlock: {
    gap: spacing.compact,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.flash,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kicker: {
    ...typography.label,
    color: colors.paper,
  },
  mode: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 10,
  },
  option: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    gap: spacing.micro,
    justifyContent: 'center',
    minHeight: 54,
    minWidth: 84,
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing.micro,
  },
  optionDisabled: {
    opacity: 0.55,
  },
  optionMark: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1,
  },
  optionMarkSelected: {
    color: colors.ink,
  },
  optionName: {
    ...typography.bodySmall,
    color: colors.paper,
    fontWeight: '700',
  },
  optionNameSelected: {
    color: colors.ink,
  },
  optionSelected: {
    backgroundColor: colors.acid,
    borderColor: colors.acid,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.compact,
  },
  pressed: {
    opacity: 0.72,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.flash,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.control,
  },
  retryLabel: {
    ...typography.utility,
    color: colors.flash,
  },
  status: {
    ...typography.utility,
    color: colors.acid,
  },
});
