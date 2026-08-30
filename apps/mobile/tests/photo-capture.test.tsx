import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import CameraScreen from '../app/(tabs)/camera';
import type { Contribution } from '../../../packages/domain/src/models';
import type { PolicyOutcome } from '../../../packages/domain/src/policy';
import type {
  CapabilityPermissionSnapshot,
  CameraCapabilityPort,
} from '../platform/camera/permissions';
import type {
  CameraPhotoCapture,
  CameraPhotoCaptureController,
  CameraPhotoCapturePort,
  CameraPhotoPreviewProps,
} from '../platform/camera/still';
import type { HapticsPort } from '../platform/haptics/feedback';
import type {
  LocalPhotoCaptureInput,
  LocalPhotoCaptureStore,
} from '../features/capture/local-photo-capture-store';
import type { PhotoCaptureDependencies } from '../features/capture/photo-capture-dependencies';

function snapshot(status: CapabilityPermissionSnapshot['status']): CapabilityPermissionSnapshot {
  return {
    canAskAgain: status === 'denied' || status === 'undetermined',
    status,
  };
}

function createCapabilities() {
  const camera = {
    check: jest.fn(async () => snapshot('granted')),
    request: jest.fn(async () => snapshot('granted')),
  };
  const microphone = {
    check: jest.fn(async () => snapshot('granted')),
    request: jest.fn(async () => snapshot('granted')),
  };
  const capabilities: CameraCapabilityPort = {
    camera,
    microphone,
    settings: { open: jest.fn(async () => undefined) },
  };
  return { capabilities, camera, microphone };
}

function createContribution(): Contribution {
  return {
    capturedAt: '2026-08-30T10:00:00.000Z',
    cycleId: 'cycle-rewind-demo',
    deletedAt: null,
    durationSeconds: 3,
    id: 'contribution-new-photo',
    localUri: 'file:///data/rewind-captures/contribution-new-photo.jpg',
    mediaKind: 'photo',
    memberId: 'member-ava',
    processingAttempt: 0,
    state: 'captured',
    vignetteTreatment: 'flash',
  };
}

function acceptedSave(): PolicyOutcome<Contribution> {
  return {
    accepted: true,
    auditEvent: {
      at: '2026-08-30T10:00:00.000Z',
      id: 'audit-photo-capture',
      metadata: { action: 'capture.accepted', idempotent: false },
      subjectId: 'contribution-new-photo',
      type: 'policy.capture.accepted',
    },
    idempotent: false,
    value: createContribution(),
  };
}

function createDependencies() {
  let resolvePhoto!: (capture: CameraPhotoCapture) => void;
  const controller: CameraPhotoCaptureController = {
    takePictureAsync: jest.fn(
      () =>
        new Promise<CameraPhotoCapture>((resolve) => {
          resolvePhoto = resolve;
        }),
    ),
  };
  const Preview = ({ controllerRef, onCameraReady }: CameraPhotoPreviewProps) => {
    useEffect(() => {
      controllerRef.current = controller;
      onCameraReady();
      return () => {
        controllerRef.current = null;
      };
    }, [controllerRef, onCameraReady]);
    return <View testID="mock-photo-preview" />;
  };
  const store: LocalPhotoCaptureStore = {
    discard: jest.fn(async (_sourceUri: string) => undefined),
    save: jest.fn(async (_input: LocalPhotoCaptureInput) => acceptedSave()),
  };
  const haptics: HapticsPort = {
    trigger: jest.fn(async () => undefined),
  };
  const dependencies: PhotoCaptureDependencies = {
    camera: { Preview } as CameraPhotoCapturePort,
    haptics,
    store,
  };

  return {
    controller,
    dependencies,
    haptics,
    resolvePhoto: (capture: CameraPhotoCapture) => resolvePhoto(capture),
    store,
  };
}

function renderPhotoScreen(
  dependencies: PhotoCaptureDependencies,
  capabilities: CameraCapabilityPort,
) {
  return render(
    <CameraScreen
      capabilities={capabilities}
      mediaKind="photo"
      photoCaptureDependencies={dependencies}
    />,
  );
}

describe('Local photo capture', () => {
  it('requests camera access without microphone access and exposes an accessible still action', async () => {
    const { capabilities, camera, microphone } = createCapabilities();
    const { dependencies } = createDependencies();
    const view = await renderPhotoScreen(dependencies, capabilities);

    await waitFor(() => expect(view.getByTestId('photo-capture')).toBeTruthy());
    expect(camera.check).toHaveBeenCalledTimes(1);
    expect(microphone.check).not.toHaveBeenCalled();
    expect(
      view.getByText('Ready for a still image. It uses a fixed three-second display duration.'),
    ).toBeTruthy();
    expect(view.getByRole('button', { name: 'Use front camera' })).toBeTruthy();
  });

  it('captures, reviews, saves, and keeps the local URI out of visible UI', async () => {
    const { capabilities } = createCapabilities();
    const { controller, dependencies, haptics, resolvePhoto, store } = createDependencies();
    const view = await renderPhotoScreen(dependencies, capabilities);

    await waitFor(() => expect(view.getByTestId('photo-capture')).toBeTruthy());
    await fireEvent.press(view.getByTestId('vignette-option-ccd'));
    expect(view.getByTestId('vignette-selection')).toHaveTextContent('CCD');
    expect(view.getByTestId('vignette-overlay')).toBeTruthy();
    await fireEvent.press(view.getByTestId('photo-capture'));
    expect(controller.takePictureAsync).toHaveBeenCalledTimes(1);
    expect(haptics.trigger).toHaveBeenCalledWith('record');
    expect(view.getByText('CAPTURING')).toBeTruthy();

    await act(async () => {
      resolvePhoto({ uri: 'file:///cache/synthetic-photo.jpg' });
      await Promise.resolve();
    });
    expect(haptics.trigger).toHaveBeenCalledWith('stop');

    await waitFor(() => expect(view.getByTestId('photo-save')).toBeTruthy());
    expect(
      view.getByText('Save the captured photo locally or discard it and take another.'),
    ).toBeTruthy();
    expect(view.queryByText('file:///cache/synthetic-photo.jpg')).toBeNull();
    await fireEvent.press(view.getByTestId('photo-save'));

    await waitFor(() => expect(view.getByTestId('photo-record-again')).toBeTruthy());
    expect(store.save).toHaveBeenCalledWith({
      capturedAt: expect.any(String),
      durationSeconds: 3,
      sourceUri: 'file:///cache/synthetic-photo.jpg',
      vignetteTreatment: 'ccd',
    });
    expect(
      view.getByText(
        'The photo was copied to local app storage. Review the capture below to submit.',
      ),
    ).toBeTruthy();
  });

  it('discards a pending cache photo before taking another', async () => {
    const { capabilities } = createCapabilities();
    const { dependencies, resolvePhoto, store } = createDependencies();
    const view = await renderPhotoScreen(dependencies, capabilities);

    await waitFor(() => expect(view.getByTestId('photo-capture')).toBeTruthy());
    await fireEvent.press(view.getByTestId('photo-capture'));
    await act(async () => {
      resolvePhoto({ uri: 'file:///cache/first-photo.jpg' });
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByTestId('photo-discard')).toBeTruthy());

    await fireEvent.press(view.getByTestId('photo-discard'));
    expect(store.discard).toHaveBeenCalledWith('file:///cache/first-photo.jpg');
    expect(view.getByTestId('photo-capture')).toBeTruthy();
  });

  it('keeps failed local writes actionable without exposing adapter errors', async () => {
    const { capabilities } = createCapabilities();
    const { dependencies, resolvePhoto } = createDependencies();
    dependencies.store.save = jest.fn(async () => {
      throw new Error('native photo path details must stay private');
    });
    const view = await renderPhotoScreen(dependencies, capabilities);

    await waitFor(() => expect(view.getByTestId('photo-capture')).toBeTruthy());
    await fireEvent.press(view.getByTestId('photo-capture'));
    await act(async () => {
      resolvePhoto({ uri: 'file:///cache/synthetic-photo.jpg' });
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByTestId('photo-save')).toBeTruthy());
    await fireEvent.press(view.getByTestId('photo-save'));

    await waitFor(() => expect(view.getByTestId('photo-capture-retry')).toBeTruthy());
    expect(view.getByText('The local photo could not be saved. Try again.')).toBeTruthy();
    expect(view.queryByText('native photo path details must stay private')).toBeNull();
  });
});
