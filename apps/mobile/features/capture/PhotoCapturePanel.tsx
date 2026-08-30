import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PHOTO_DURATION_SECONDS } from '../../../../packages/domain/src/policy';

import { colors, radii, spacing, typography } from '../../components/tokens';
import type { CameraPhotoCaptureController } from '../../platform/camera/still';
import type { PhotoCaptureDependencies } from './photo-capture-dependencies';
import { createLocalPhotoCaptureDependencies } from './photo-capture-dependencies';

type PhotoCapturePhase =
  'capturing' | 'error' | 'loading' | 'ready' | 'review' | 'saved' | 'saving';

type PendingPhoto = {
  readonly sourceUri: string;
};

type CameraFacing = 'back' | 'front';

type PhotoCapturePanelProps = {
  dependencies?: PhotoCaptureDependencies;
  onContributionSaved?: () => void;
};

const captureError = 'The local photo could not be saved. Try again.';
const photoError = 'The camera could not capture a still. Try again.';
const previewError = 'The camera preview could not start. Try again.';

export function PhotoCapturePanel({
  dependencies: providedDependencies,
  onContributionSaved,
}: PhotoCapturePanelProps) {
  const [dependencies, setDependencies] = useState<PhotoCaptureDependencies | null>(
    providedDependencies ?? null,
  );
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [dependencyRetryToken, setDependencyRetryToken] = useState(0);
  const [facing, setFacing] = useState<CameraFacing>('back');
  const [previewReady, setPreviewReady] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [phase, setPhase] = useState<PhotoCapturePhase>(providedDependencies ? 'ready' : 'loading');
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<CameraPhotoCaptureController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (providedDependencies) {
      return;
    }

    let cancelled = false;

    void createLocalPhotoCaptureDependencies()
      .then((nextDependencies) => {
        if (cancelled) {
          return;
        }
        setDependencies(nextDependencies);
        setPhase('ready');
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setDependencyError('The local photo camera could not be prepared. Try again.');
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
  }, [dependencyRetryToken, providedDependencies]);

  const resetForNewPhoto = useCallback(() => {
    const needsPreviewRestart = !previewReady || phase === 'saved';
    setPendingPhoto(null);
    setError(null);
    if (needsPreviewRestart) {
      setPreviewReady(false);
      setPreviewKey((current) => current + 1);
    }
    setPhase('ready');
  }, [phase, previewReady]);

  const localStore = dependencies?.store;
  const discardPendingPhoto = useCallback(() => {
    const sourceUri = pendingPhoto?.sourceUri;
    resetForNewPhoto();
    if (sourceUri && localStore) {
      void localStore.discard(sourceUri).catch(() => undefined);
    }
  }, [localStore, pendingPhoto, resetForNewPhoto]);

  const retryDependencies = useCallback(() => {
    setDependencies(null);
    setDependencyError(null);
    setError(null);
    setPreviewReady(false);
    setPhase('loading');
    setDependencyRetryToken((current) => current + 1);
  }, []);

  const handlePreviewError = useCallback(() => {
    setPreviewReady(false);
    setError(previewError);
    setPhase('error');
  }, []);

  const takePhoto = useCallback(() => {
    const controller = controllerRef.current;
    if (phase !== 'ready' || !previewReady || !controller) {
      return;
    }

    setError(null);
    setPhase('capturing');

    void controller
      .takePictureAsync()
      .then((capture) => {
        if (!capture || !mountedRef.current) {
          if (mountedRef.current) {
            setError(photoError);
            setPhase('error');
          }
          return;
        }
        setPendingPhoto({ sourceUri: capture.uri });
        setPhase('review');
      })
      .catch(() => {
        if (!mountedRef.current) {
          return;
        }
        setError(photoError);
        setPhase('error');
      });
  }, [phase, previewReady]);

  const savePhoto = useCallback(async () => {
    if (!dependencies || !pendingPhoto || phase !== 'review') {
      return;
    }

    setError(null);
    setPhase('saving');
    try {
      const result = await dependencies.store.save({
        capturedAt: new Date().toISOString(),
        durationSeconds: PHOTO_DURATION_SECONDS,
        sourceUri: pendingPhoto.sourceUri,
        vignetteTreatment: 'flash',
      });
      if (!mountedRef.current) {
        return;
      }
      if (!result.accepted) {
        setError(result.reason);
        setPhase('error');
        return;
      }
      setPendingPhoto(null);
      setPhase('saved');
      onContributionSaved?.();
    } catch {
      if (!mountedRef.current) {
        return;
      }
      setError(captureError);
      setPhase('error');
    }
  }, [dependencies, onContributionSaved, pendingPhoto, phase]);

  const flipCamera = useCallback(() => {
    if (phase === 'ready' && previewReady) {
      setFacing((current) => (current === 'back' ? 'front' : 'back'));
    }
  }, [phase, previewReady]);

  const statusCopy = dependencyError ?? error ?? getStatusCopy(phase, previewReady);
  const isBusy = phase === 'capturing' || phase === 'saving';
  const Preview = dependencies?.camera.Preview;

  return (
    <View style={styles.panel} testID="photo-capture-panel">
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>LOCAL PHOTO</Text>
        <Text style={styles.mode}>STILL · 03 SEC</Text>
      </View>

      <View style={styles.previewFrame} testID="photo-camera-preview">
        {Preview && phase !== 'saved' ? (
          <Preview
            controllerRef={controllerRef}
            facing={facing}
            onCameraReady={() => setPreviewReady(true)}
            onMountError={handlePreviewError}
            style={styles.preview}
            key={previewKey}
          />
        ) : null}
        {!previewReady && phase !== 'error' && phase !== 'saved' ? (
          <View
            accessible
            accessibilityLabel="Camera preview is loading"
            style={styles.previewOverlay}
          >
            <Text style={styles.previewNote}>
              {phase === 'loading' ? 'PREPARING CAMERA…' : 'STARTING CAMERA…'}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        accessible
        accessibilityLabel={`Photo capture status: ${statusCopy}`}
        style={styles.statusBlock}
        testID="photo-capture-status"
      >
        <Text
          style={[styles.phase, phase === 'saved' && styles.phaseReady]}
          testID="photo-capture-phase"
        >
          {phaseLabel(phase)}
        </Text>
        <Text style={styles.statusCopy}>{statusCopy}</Text>
      </View>

      <View style={styles.controls}>
        <Text style={styles.timer} testID="photo-capture-duration">
          DISPLAY / 00:03
        </Text>
        <Pressable
          accessibilityLabel={facing === 'back' ? 'Use front camera' : 'Use back camera'}
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy || !previewReady }}
          disabled={isBusy || !previewReady}
          onPress={flipCamera}
          style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
          testID="camera-photo-flip"
        >
          <Text style={styles.controlLabel}>{facing === 'back' ? 'FLIP FRONT' : 'FLIP BACK'}</Text>
        </Pressable>
      </View>

      {phase === 'review' ? (
        <View style={styles.actionStack}>
          <CaptureButton
            disabled={false}
            label="SAVE LOCAL PHOTO"
            onPress={() => {
              void savePhoto();
            }}
            testID="photo-save"
          />
          <CaptureButton
            disabled={false}
            label="DISCARD · TAKE AGAIN"
            onPress={discardPendingPhoto}
            secondary
            testID="photo-discard"
          />
        </View>
      ) : phase === 'saved' ? (
        <CaptureButton
          disabled={false}
          label="CAPTURE ANOTHER PHOTO"
          onPress={resetForNewPhoto}
          testID="photo-record-again"
        />
      ) : phase === 'error' ? (
        <View style={styles.actionStack}>
          <CaptureButton
            disabled={false}
            label={dependencyError ? 'PREPARE CAMERA AGAIN' : 'CAPTURE AGAIN'}
            onPress={
              pendingPhoto
                ? discardPendingPhoto
                : dependencyError
                  ? retryDependencies
                  : resetForNewPhoto
            }
            testID="photo-capture-retry"
          />
          {pendingPhoto ? (
            <CaptureButton
              disabled={false}
              label="DISCARD CAPTURE"
              onPress={discardPendingPhoto}
              secondary
              testID="photo-discard-error"
            />
          ) : null}
        </View>
      ) : (
        <CaptureButton
          disabled={!previewReady || phase !== 'ready'}
          label={
            phase === 'loading'
              ? 'PREPARING CAMERA…'
              : phase === 'capturing'
                ? 'CAPTURING…'
                : phase === 'saving'
                  ? 'SAVING…'
                  : 'CAPTURE STILL'
          }
          onPress={takePhoto}
          testID="photo-capture"
        />
      )}

      <Text accessibilityRole="text" style={styles.disclosure}>
        LOCAL FILE COPY · REVIEW AND SUBMIT BELOW
      </Text>
    </View>
  );
}

function phaseLabel(phase: PhotoCapturePhase): string {
  switch (phase) {
    case 'capturing':
      return 'CAPTURING';
    case 'error':
      return 'ACTION NEEDED';
    case 'loading':
      return 'PREPARING';
    case 'ready':
      return 'READY FOR PHOTO';
    case 'review':
      return 'REVIEW PHOTO';
    case 'saved':
      return 'PHOTO STORED';
    case 'saving':
      return 'COPYING LOCAL FILE';
  }
}

function getStatusCopy(phase: PhotoCapturePhase, previewReady: boolean): string {
  switch (phase) {
    case 'capturing':
      return 'Capturing one local still image.';
    case 'error':
      return previewError;
    case 'loading':
      return 'Preparing the local photo camera.';
    case 'ready':
      return previewReady
        ? 'Ready for a still image. It uses a fixed three-second display duration.'
        : 'Waiting for the local camera preview.';
    case 'review':
      return 'Save the captured photo locally or discard it and take another.';
    case 'saved':
      return 'The photo was copied to local app storage. Review the capture below to submit.';
    case 'saving':
      return 'Copying the photo from cache into local app storage.';
  }
}

type CaptureButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
  testID: string;
};

function CaptureButton({
  disabled,
  label,
  onPress,
  secondary = false,
  testID,
}: CaptureButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.captureButton,
        secondary ? styles.captureButtonSecondary : styles.captureButtonPrimary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      testID={testID}
    >
      <Text style={secondary ? styles.captureLabelSecondary : styles.captureLabelPrimary}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionStack: {
    gap: spacing.compact,
  },
  captureButton: {
    alignItems: 'center',
    borderRadius: radii.control,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.control,
    width: '100%',
  },
  captureButtonPrimary: {
    backgroundColor: colors.acid,
    borderColor: colors.acid,
    borderWidth: 1,
  },
  captureButtonSecondary: {
    borderColor: colors.paper,
    borderWidth: 1,
  },
  captureLabelPrimary: {
    ...typography.utility,
    color: colors.ink,
  },
  captureLabelSecondary: {
    ...typography.utility,
    color: colors.paper,
  },
  controlButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.compact,
  },
  controlLabel: {
    ...typography.utility,
    color: colors.paper,
    fontSize: 9,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  kicker: {
    ...typography.label,
    color: colors.paper,
  },
  mode: {
    ...typography.utility,
    color: colors.muted,
    fontSize: 10,
  },
  panel: {
    gap: spacing.compact,
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
  preview: {
    backgroundColor: colors.ink,
    height: 320,
    width: 180,
  },
  previewFrame: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderWidth: 1,
    height: 320,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewNote: {
    ...typography.utility,
    color: colors.muted,
    textAlign: 'center',
  },
  previewOverlay: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
  timer: {
    ...typography.utility,
    color: colors.acid,
    fontVariant: ['tabular-nums'],
  },
});
