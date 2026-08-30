import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  CapabilityPermissionSnapshot,
  CameraCapabilityPort,
  CameraPermissionResource,
} from '../../platform/camera/permissions';

export type CameraMediaKind = 'photo' | 'video';

export type CameraPermissionPhase =
  'blocked' | 'denied' | 'error' | 'grant' | 'loading' | 'ready' | 'unsupported';

type PermissionSnapshots = {
  camera: CapabilityPermissionSnapshot | null;
  microphone: CapabilityPermissionSnapshot | null;
};

export type CameraPermissionPendingAction = CameraPermissionResource | 'settings' | null;

export interface CameraPermissionState {
  readonly camera: CapabilityPermissionSnapshot | null;
  readonly error: string | null;
  readonly microphone: CapabilityPermissionSnapshot | null;
  readonly openSettings: () => Promise<void>;
  readonly pendingAction: CameraPermissionPendingAction;
  readonly phase: CameraPermissionPhase;
  readonly requiredPermission: CameraPermissionResource | null;
  readonly requestPermission: () => Promise<void>;
  readonly retry: () => void;
}

const emptySnapshots: PermissionSnapshots = {
  camera: null,
  microphone: null,
};

const permissionCheckError = 'Device permissions could not be checked. Try again.';
const permissionRequestError = 'The permission request could not be completed. Try again.';
const settingsError = 'Device settings could not be opened. Try again.';

function requiredResources(mediaKind: CameraMediaKind): readonly CameraPermissionResource[] {
  return mediaKind === 'video' ? ['camera', 'microphone'] : ['camera'];
}

function assessPermissions(
  mediaKind: CameraMediaKind,
  snapshots: PermissionSnapshots,
  error: string | null,
): Pick<CameraPermissionState, 'phase' | 'requiredPermission'> {
  if (error) {
    return { phase: 'error', requiredPermission: null };
  }

  const required = requiredResources(mediaKind);
  if (required.some((resource) => snapshots[resource] === null)) {
    return { phase: 'loading', requiredPermission: null };
  }

  const unsupportedResource = required.find(
    (resource) => snapshots[resource]?.status === 'unsupported',
  );
  if (unsupportedResource) {
    return { phase: 'unsupported', requiredPermission: unsupportedResource };
  }

  const blockedResource = required.find((resource) => snapshots[resource]?.status === 'blocked');
  if (blockedResource) {
    return { phase: 'blocked', requiredPermission: blockedResource };
  }

  const deniedResource = required.find((resource) => snapshots[resource]?.status === 'denied');
  if (deniedResource) {
    return { phase: 'denied', requiredPermission: deniedResource };
  }

  const grantResource = required.find((resource) => snapshots[resource]?.status === 'undetermined');
  if (grantResource) {
    return { phase: 'grant', requiredPermission: grantResource };
  }

  return { phase: 'ready', requiredPermission: null };
}

export function useCameraPermissionState(
  mediaKind: CameraMediaKind,
  providedCapabilities?: CameraCapabilityPort,
): CameraPermissionState {
  const [snapshots, setSnapshots] = useState<PermissionSnapshots>(emptySnapshots);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<CameraPermissionPendingAction>(null);
  const [retryToken, setRetryToken] = useState(0);
  const capabilitiesRef = useRef<CameraCapabilityPort | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    capabilitiesRef.current = null;

    const capabilitiesPromise = providedCapabilities
      ? Promise.resolve(providedCapabilities)
      : import('../../platform/camera/expo-camera-permissions').then(
          ({ createExpoCameraCapabilityPort }) => createExpoCameraCapabilityPort(),
        );

    void capabilitiesPromise
      .then(async (capabilities) => {
        if (cancelled) {
          return null;
        }

        capabilitiesRef.current = capabilities;
        const [camera, microphone] = await Promise.all([
          capabilities.camera.check(),
          capabilities.microphone.check(),
        ]);
        return { camera, microphone };
      })
      .then((nextSnapshots) => {
        if (!nextSnapshots || cancelled) {
          return;
        }
        setSnapshots(nextSnapshots);
        setError(null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        capabilitiesRef.current = null;
        setError(permissionCheckError);
      });

    return () => {
      cancelled = true;
    };
  }, [providedCapabilities, retryToken]);

  const assessment = useMemo(
    () => assessPermissions(mediaKind, snapshots, error),
    [error, mediaKind, snapshots],
  );

  const requestPermission = useCallback(async () => {
    const resource = assessment.requiredPermission;
    const permissionPort = resource ? capabilitiesRef.current?.[resource] : undefined;
    if (
      !resource ||
      !permissionPort ||
      pendingAction !== null ||
      (assessment.phase !== 'grant' && assessment.phase !== 'denied')
    ) {
      return;
    }

    setPendingAction(resource);
    setError(null);
    try {
      const nextSnapshot = await permissionPort.request();
      if (mountedRef.current) {
        setSnapshots((current) => ({ ...current, [resource]: nextSnapshot }));
      }
    } catch {
      if (mountedRef.current) {
        setError(permissionRequestError);
      }
    } finally {
      if (mountedRef.current) {
        setPendingAction(null);
      }
    }
  }, [assessment.phase, assessment.requiredPermission, pendingAction]);

  const openSettings = useCallback(async () => {
    const settings = capabilitiesRef.current?.settings;
    if (!settings || pendingAction !== null || assessment.phase !== 'blocked') {
      return;
    }

    setPendingAction('settings');
    setError(null);
    try {
      await settings.open();
    } catch {
      if (mountedRef.current) {
        setError(settingsError);
      }
    } finally {
      if (mountedRef.current) {
        setPendingAction(null);
      }
    }
  }, [assessment.phase, pendingAction]);

  const retry = useCallback(() => {
    capabilitiesRef.current = null;
    setSnapshots(emptySnapshots);
    setError(null);
    setPendingAction(null);
    setRetryToken((current) => current + 1);
  }, []);

  return {
    camera: snapshots.camera,
    error,
    microphone: snapshots.microphone,
    openSettings,
    pendingAction,
    phase: assessment.phase,
    requiredPermission: assessment.requiredPermission,
    requestPermission,
    retry,
  };
}
