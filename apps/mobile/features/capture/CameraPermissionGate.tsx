import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../../components/FrameCard';
import { colors, radii, spacing, typography } from '../../components/tokens';
import type {
  CameraCapabilityPort,
  CameraPermissionResource,
} from '../../platform/camera/permissions';
import {
  type CameraMediaKind,
  type CameraPermissionPhase,
  useCameraPermissionState,
} from './camera-permission-state';

type CameraPermissionGateProps = {
  capabilities?: CameraCapabilityPort;
  initialMediaKind?: CameraMediaKind;
  renderReady?: (mediaKind: CameraMediaKind) => ReactNode;
  showMediaKindPicker?: boolean;
};

const resourceLabels: Record<CameraPermissionResource, string> = {
  camera: 'camera',
  microphone: 'microphone',
};

const phaseLabels: Record<CameraPermissionPhase, string> = {
  blocked: 'ACCESS BLOCKED',
  denied: 'ACCESS DENIED',
  error: 'CHECK FAILED',
  grant: 'ACTION NEEDED',
  loading: 'CHECKING ACCESS',
  ready: 'ACCESS READY',
  unsupported: 'UNAVAILABLE',
};

function getStatusCopy(
  phase: CameraPermissionPhase,
  mediaKind: CameraMediaKind,
  requiredPermission: CameraPermissionResource | null,
): string {
  const resource = requiredPermission ? resourceLabels[requiredPermission] : 'camera';

  switch (phase) {
    case 'blocked':
      return `${resource[0]?.toUpperCase()}${resource.slice(1)} access is blocked. Open device settings to allow it.`;
    case 'denied':
      return `${resource[0]?.toUpperCase()}${resource.slice(1)} access was denied. Try the permission again.`;
    case 'error':
      return 'Device permissions could not be checked. Try again.';
    case 'grant':
      return `Allow ${resource} access to continue with a local ${mediaKind}.`;
    case 'loading':
      return 'Checking camera and microphone access on this device.';
    case 'ready':
      return mediaKind === 'photo'
        ? 'Camera access is ready for a local photo.'
        : 'Camera and microphone access are ready for local video.';
    case 'unsupported':
      return `${resource[0]?.toUpperCase()}${resource.slice(1)} access is not available on this device.`;
  }
}

function getActionLabel(
  phase: CameraPermissionPhase,
  resource: CameraPermissionResource | null,
): string {
  const name = resource ? resourceLabels[resource] : 'camera';
  return phase === 'grant' ? `Allow ${name} permission` : `Retry ${name} permission`;
}

export function CameraPermissionGate({
  capabilities,
  initialMediaKind = 'photo',
  renderReady,
  showMediaKindPicker = true,
}: CameraPermissionGateProps) {
  const [mediaKind, setMediaKind] = useState<CameraMediaKind>(initialMediaKind);
  const permission = useCameraPermissionState(mediaKind, capabilities);
  const {
    error,
    openSettings,
    pendingAction,
    phase,
    requiredPermission,
    requestPermission,
    retry,
  } = permission;
  const isBusy = pendingAction !== null;
  const statusCopy = error ?? getStatusCopy(phase, mediaKind, requiredPermission);
  const readyContent = renderReady?.(mediaKind);

  return (
    <FrameCard
      accessible={false}
      accessibilityLabel="Local camera permission preflight"
      accent={colors.flash}
      testID="camera-permission-panel"
    >
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>PERMISSION PREFLIGHT</Text>
        <Text style={styles.mode}>LOCAL DEVICE</Text>
      </View>

      {showMediaKindPicker ? (
        <View style={styles.kindSection}>
          <Text style={styles.sectionLabel}>CAPTURE KIND</Text>
          <View style={styles.kindOptions}>
            <MediaKindButton
              disabled={isBusy}
              kind="photo"
              onPress={() => setMediaKind('photo')}
              selected={mediaKind === 'photo'}
            />
            <MediaKindButton
              disabled={isBusy}
              kind="video"
              onPress={() => setMediaKind('video')}
              selected={mediaKind === 'video'}
            />
          </View>
        </View>
      ) : null}

      <View
        accessible
        accessibilityLabel={`Local permission status: ${statusCopy}`}
        style={styles.statusBlock}
        testID="camera-permission-status"
      >
        <Text
          style={[styles.phase, phase === 'ready' && styles.phaseReady]}
          testID="camera-permission-phase"
        >
          {phaseLabels[phase]}
        </Text>
        <Text style={styles.statusCopy}>{statusCopy}</Text>
      </View>

      <View style={styles.actionSlot}>
        {phase === 'loading' ? (
          <Text style={styles.actionNote} testID="camera-permission-loading">
            CHECKING…
          </Text>
        ) : phase === 'ready' ? (
          (readyContent ?? (
            <Text style={styles.actionNote} testID="camera-permission-ready">
              ACCESS READY · RECORDING ARRIVES NEXT
            </Text>
          ))
        ) : phase === 'blocked' ? (
          <View style={styles.actionStack}>
            <PermissionButton
              disabled={isBusy}
              label={pendingAction === 'settings' ? 'OPENING SETTINGS…' : 'OPEN DEVICE SETTINGS'}
              onPress={() => {
                void openSettings();
              }}
              secondary={false}
              testID="camera-permission-settings"
            />
            <PermissionButton
              disabled={isBusy}
              label="CHECK PERMISSIONS AGAIN"
              onPress={retry}
              secondary
              testID="camera-permission-check"
            />
          </View>
        ) : phase === 'grant' || phase === 'denied' ? (
          <PermissionButton
            disabled={isBusy}
            label={
              pendingAction === requiredPermission
                ? `REQUESTING ${requiredPermission ? resourceLabels[requiredPermission].toUpperCase() : 'ACCESS'}…`
                : phase === 'grant'
                  ? `ALLOW ${requiredPermission ? resourceLabels[requiredPermission].toUpperCase() : 'ACCESS'}`
                  : `TRY ${requiredPermission ? resourceLabels[requiredPermission].toUpperCase() : 'ACCESS'} AGAIN`
            }
            onPress={() => {
              void requestPermission();
            }}
            accessibilityLabel={getActionLabel(phase, requiredPermission)}
            secondary={false}
            testID="camera-permission-action"
          />
        ) : (
          <PermissionButton
            disabled={isBusy}
            label={pendingAction === null ? 'TRY AGAIN' : 'CHECKING…'}
            onPress={retry}
            secondary
            testID="camera-permission-retry"
          />
        )}
      </View>

      <Text accessibilityRole="text" style={styles.disclosure}>
        {mediaKind === 'video' && renderReady
          ? 'LOCAL PERMISSION CHECK · RECORDING STAYS ON DEVICE'
          : 'LOCAL PERMISSION CHECK · NO RECORDING IN THIS SLICE'}
      </Text>
    </FrameCard>
  );
}

type MediaKindButtonProps = {
  disabled: boolean;
  kind: CameraMediaKind;
  onPress: () => void;
  selected: boolean;
};

function MediaKindButton({ disabled, kind, onPress, selected }: MediaKindButtonProps) {
  const label = kind === 'photo' ? 'Choose photo capture' : 'Choose video capture';
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.kindButton,
        selected && styles.kindButtonSelected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      testID={`camera-media-${kind}`}
    >
      <Text style={[styles.kindName, selected && styles.kindNameSelected]}>
        {kind.toUpperCase()}
      </Text>
      <Text style={[styles.kindDetail, selected && styles.kindDetailSelected]}>
        {kind === 'photo' ? 'CAMERA ONLY' : 'CAMERA + MIC'}
      </Text>
    </Pressable>
  );
}

type PermissionButtonProps = {
  accessibilityLabel?: string;
  disabled: boolean;
  label: string;
  onPress: () => void;
  secondary: boolean;
  testID: string;
};

function PermissionButton({
  accessibilityLabel,
  disabled,
  label,
  onPress,
  secondary,
  testID,
}: PermissionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary ? styles.actionButtonSecondary : styles.actionButtonPrimary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      testID={testID}
    >
      <Text style={secondary ? styles.actionLabelSecondary : styles.actionLabelPrimary}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: radii.control,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.control,
    width: '100%',
  },
  actionButtonPrimary: {
    backgroundColor: colors.acid,
    borderColor: colors.acid,
    borderWidth: 1,
  },
  actionButtonSecondary: {
    borderColor: colors.paper,
    borderWidth: 1,
  },
  actionLabelPrimary: {
    ...typography.utility,
    color: colors.ink,
  },
  actionLabelSecondary: {
    ...typography.utility,
    color: colors.paper,
  },
  actionNote: {
    ...typography.utility,
    color: colors.acid,
    textAlign: 'center',
  },
  actionSlot: {
    justifyContent: 'center',
    minHeight: 106,
  },
  actionStack: {
    gap: spacing.compact,
  },
  disabled: {
    opacity: 0.5,
  },
  disclosure: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kindButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    gap: spacing.micro,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.compact,
  },
  kindButtonSelected: {
    backgroundColor: colors.acid,
    borderColor: colors.acid,
  },
  kindDetail: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1,
  },
  kindDetailSelected: {
    color: colors.ink,
  },
  kindName: {
    ...typography.bodySmall,
    color: colors.paper,
    fontWeight: '800',
  },
  kindNameSelected: {
    color: colors.ink,
  },
  kindOptions: {
    flexDirection: 'row',
    gap: spacing.compact,
  },
  kindSection: {
    gap: spacing.compact,
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
  phase: {
    ...typography.utility,
    color: colors.flash,
  },
  phaseReady: {
    color: colors.acid,
  },
  pressed: {
    opacity: 0.72,
  },
  sectionLabel: {
    ...typography.utility,
    color: colors.muted,
  },
  statusBlock: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: spacing.micro,
    paddingBottom: spacing.inset,
  },
  statusCopy: {
    ...typography.bodySmall,
    color: colors.muted,
  },
});
