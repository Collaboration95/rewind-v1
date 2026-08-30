import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  MAX_VIDEO_DURATION_SECONDS,
  MIN_VIDEO_DURATION_SECONDS,
} from '../../../../packages/domain/src/policy';
import type { VignetteTreatment } from '../../../../packages/domain/src/models';

import { colors, radii, spacing, typography } from '../../components/tokens';
import type { CameraFacing, CameraRecordingController } from '../../platform/camera/recording';
import type { HapticCue, HapticsPort } from '../../platform/haptics/feedback';
import type { VideoCaptureDependencies } from './video-capture-dependencies';
import { createLocalVideoCaptureDependencies } from './video-capture-dependencies';
import { VignetteOverlay, VignetteTreatmentPicker } from './vignette-treatments';

type VideoCapturePhase =
  'error' | 'loading' | 'ready' | 'recording' | 'review' | 'saved' | 'saving' | 'stopping';

type PendingVideo = {
  readonly durationSeconds: number;
  readonly sourceUri: string;
};

type VideoCapturePanelProps = {
  dependencies?: VideoCaptureDependencies;
  haptics?: HapticsPort;
  onContributionSaved?: () => void;
};

const captureError = 'The local video could not be saved. Record again.';
const recordingError = 'The camera could not start recording. Try again.';
const previewError = 'The camera preview could not start. Try again.';
const shortVideoError = 'Record for at least one second before saving.';

export function VideoCapturePanel({
  dependencies: providedDependencies,
  haptics: providedHaptics,
  onContributionSaved,
}: VideoCapturePanelProps) {
  const [dependencies, setDependencies] = useState<VideoCaptureDependencies | null>(
    providedDependencies ?? null,
  );
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [dependencyRetryToken, setDependencyRetryToken] = useState(0);
  const [facing, setFacing] = useState<CameraFacing>('back');
  const [previewReady, setPreviewReady] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [phase, setPhase] = useState<VideoCapturePhase>(providedDependencies ? 'ready' : 'loading');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vignetteTreatment, setVignetteTreatment] = useState<VignetteTreatment>('flash');
  const controllerRef = useRef<CameraRecordingController | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
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

    void createLocalVideoCaptureDependencies()
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
        setDependencyError('The local camera could not be prepared. Try again.');
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
  }, [dependencyRetryToken, providedDependencies]);

  useEffect(() => {
    if (phase !== 'recording' || recordingStartedAtRef.current === null) {
      return;
    }

    const updateElapsed = () => {
      const startedAt = recordingStartedAtRef.current;
      if (startedAt === null) {
        return;
      }
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSeconds(Math.min(MAX_VIDEO_DURATION_SECONDS, Math.max(0, seconds)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 250);
    return () => clearInterval(timer);
  }, [phase]);

  const resetForNewRecording = useCallback(() => {
    const needsPreviewRestart = !previewReady || phase === 'saved';
    setPendingVideo(null);
    setElapsedSeconds(0);
    setError(null);
    if (needsPreviewRestart) {
      setPreviewReady(false);
      setPreviewKey((current) => current + 1);
    }
    setPhase('ready');
  }, [phase, previewReady]);

  const localStore = dependencies?.store;
  const haptics = dependencies?.haptics ?? providedHaptics;
  const discardPendingVideo = useCallback(() => {
    const sourceUri = pendingVideo?.sourceUri;
    resetForNewRecording();
    if (sourceUri && localStore) {
      void localStore.discard(sourceUri).catch(() => undefined);
    }
  }, [localStore, pendingVideo, resetForNewRecording]);

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

  const startRecording = useCallback(() => {
    const controller = controllerRef.current;
    if (phase !== 'ready' || !previewReady || !controller) {
      return;
    }

    const startedAt = Date.now();
    recordingStartedAtRef.current = startedAt;
    setElapsedSeconds(0);
    setError(null);
    setPhase('recording');
    triggerHaptic(haptics, 'record');

    void controller
      .recordAsync({ maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS })
      .then((capture) => {
        if (!capture || !mountedRef.current) {
          if (mountedRef.current) {
            recordingStartedAtRef.current = null;
            setError(recordingError);
            setPhase('error');
          }
          return;
        }

        const durationSeconds = Math.min(
          MAX_VIDEO_DURATION_SECONDS,
          Math.max(0, Math.floor(capture.durationSeconds ?? (Date.now() - startedAt) / 1000)),
        );
        recordingStartedAtRef.current = null;
        setElapsedSeconds(durationSeconds);
        if (durationSeconds < MIN_VIDEO_DURATION_SECONDS) {
          setPendingVideo(null);
          void dependencies?.store.discard(capture.uri).catch(() => undefined);
          setError(shortVideoError);
          setPhase('error');
          return;
        }
        setPendingVideo({ durationSeconds, sourceUri: capture.uri });
        setPhase('review');
      })
      .catch(() => {
        if (!mountedRef.current) {
          return;
        }
        recordingStartedAtRef.current = null;
        setError(recordingError);
        setPhase('error');
      });
  }, [dependencies, haptics, phase, previewReady]);

  const stopRecording = useCallback(() => {
    if (phase !== 'recording') {
      return;
    }

    setPhase('stopping');
    triggerHaptic(haptics, 'stop');
    try {
      controllerRef.current?.stopRecording();
    } catch {
      recordingStartedAtRef.current = null;
      setError(recordingError);
      setPhase('error');
    }
  }, [haptics, phase]);

  const saveVideo = useCallback(async () => {
    if (!dependencies || !pendingVideo || phase !== 'review') {
      return;
    }

    setError(null);
    setPhase('saving');
    try {
      const result = await dependencies.store.save({
        capturedAt: new Date().toISOString(),
        durationSeconds: pendingVideo.durationSeconds,
        sourceUri: pendingVideo.sourceUri,
        vignetteTreatment,
      });
      if (!mountedRef.current) {
        return;
      }
      if (!result.accepted) {
        setError(result.reason);
        setPhase('error');
        return;
      }
      setPendingVideo(null);
      setPhase('saved');
      onContributionSaved?.();
    } catch {
      if (!mountedRef.current) {
        return;
      }
      setError(captureError);
      setPhase('error');
    }
  }, [dependencies, onContributionSaved, pendingVideo, phase, vignetteTreatment]);

  const flipCamera = useCallback(() => {
    if (phase === 'ready' && previewReady) {
      setFacing((current) => (current === 'back' ? 'front' : 'back'));
    }
  }, [phase, previewReady]);

  const statusCopy = dependencyError ?? error ?? getStatusCopy(phase, previewReady);
  const isBusy = phase === 'recording' || phase === 'saving' || phase === 'stopping';
  const Preview = dependencies?.camera.Preview;

  return (
    <View style={styles.panel} testID="video-capture-panel">
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>LOCAL VIDEO</Text>
        <Text style={styles.mode}>VERTICAL · 1—15 SEC</Text>
      </View>

      <VignetteTreatmentPicker
        disabled={phase !== 'ready' || !previewReady}
        onChange={setVignetteTreatment}
        value={vignetteTreatment}
      />

      <View style={styles.previewFrame} testID="camera-preview">
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
        <VignetteOverlay testID="vignette-overlay" treatment={vignetteTreatment} />
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
        accessibilityLabel={`Video capture status: ${statusCopy}`}
        style={styles.statusBlock}
        testID="video-capture-status"
      >
        <Text
          style={[styles.phase, phase === 'saved' && styles.phaseReady]}
          testID="video-capture-phase"
        >
          {phaseLabel(phase)}
        </Text>
        <Text style={styles.statusCopy}>{statusCopy}</Text>
      </View>

      <View style={styles.controls}>
        <Text style={styles.timer} testID="video-capture-timer">
          {formatTimer(elapsedSeconds)} / 00:15
        </Text>
        <Pressable
          accessibilityLabel={facing === 'back' ? 'Use front camera' : 'Use back camera'}
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy || !previewReady }}
          disabled={isBusy || !previewReady}
          onPress={flipCamera}
          style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
          testID="camera-flip"
        >
          <Text style={styles.controlLabel}>{facing === 'back' ? 'FLIP FRONT' : 'FLIP BACK'}</Text>
        </Pressable>
      </View>

      {phase === 'recording' || phase === 'stopping' ? (
        <CaptureButton
          disabled={phase === 'stopping'}
          label={phase === 'stopping' ? 'STOPPING…' : 'STOP RECORDING'}
          onPress={stopRecording}
          testID="video-stop"
        />
      ) : phase === 'review' ? (
        <View style={styles.actionStack}>
          <CaptureButton
            disabled={false}
            label="SAVE LOCAL VIDEO"
            onPress={() => {
              void saveVideo();
            }}
            testID="video-save"
          />
          <CaptureButton
            disabled={false}
            label="DISCARD · RECORD AGAIN"
            onPress={discardPendingVideo}
            secondary
            testID="video-discard"
          />
        </View>
      ) : phase === 'saved' ? (
        <CaptureButton
          disabled={false}
          label="RECORD ANOTHER VIDEO"
          onPress={resetForNewRecording}
          testID="video-record-again"
        />
      ) : phase === 'error' ? (
        <View style={styles.actionStack}>
          <CaptureButton
            disabled={false}
            label={dependencyError ? 'PREPARE CAMERA AGAIN' : 'RECORD AGAIN'}
            onPress={dependencyError ? retryDependencies : resetForNewRecording}
            testID="video-capture-retry"
          />
          {pendingVideo ? (
            <CaptureButton
              disabled={false}
              label="DISCARD CAPTURE"
              onPress={discardPendingVideo}
              secondary
              testID="video-discard-error"
            />
          ) : null}
        </View>
      ) : (
        <CaptureButton
          disabled={!previewReady || phase !== 'ready'}
          label={phase === 'loading' ? 'PREPARING CAMERA…' : 'START RECORDING'}
          onPress={startRecording}
          testID="video-record"
        />
      )}

      <Text accessibilityRole="text" style={styles.disclosure}>
        LOCAL FILE COPY · REVIEW AND SUBMIT BELOW
      </Text>
    </View>
  );
}

function triggerHaptic(haptics: HapticsPort | undefined, cue: HapticCue): void {
  if (haptics) {
    try {
      void haptics.trigger(cue).catch(() => undefined);
    } catch {
      // Haptics are optional and must not block local capture.
    }
  }
}

function phaseLabel(phase: VideoCapturePhase): string {
  switch (phase) {
    case 'error':
      return 'ACTION NEEDED';
    case 'loading':
      return 'PREPARING';
    case 'ready':
      return 'READY TO RECORD';
    case 'recording':
      return 'RECORDING';
    case 'review':
      return 'REVIEW CAPTURE';
    case 'saved':
      return 'CAPTURE STORED';
    case 'saving':
      return 'COPYING LOCAL FILE';
    case 'stopping':
      return 'FINISHING RECORDING';
  }
}

function getStatusCopy(phase: VideoCapturePhase, previewReady: boolean): string {
  switch (phase) {
    case 'error':
      return previewError;
    case 'loading':
      return 'Preparing the local video camera.';
    case 'ready':
      return previewReady
        ? 'Ready for a vertical local video. Maximum duration is 15 seconds.'
        : 'Waiting for the local camera preview.';
    case 'recording':
      return 'Recording stays on this device until you save or discard it.';
    case 'review':
      return 'Save the captured video locally or discard it and record again.';
    case 'saved':
      return 'The video was copied to local app storage. Review the capture below to submit.';
    case 'saving':
      return 'Copying the video from cache into local app storage.';
    case 'stopping':
      return 'Finishing the local video capture.';
  }
}

function formatTimer(seconds: number): string {
  const safeSeconds = Math.min(MAX_VIDEO_DURATION_SECONDS, Math.max(0, seconds));
  return `00:${String(safeSeconds).padStart(2, '0')}`;
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
