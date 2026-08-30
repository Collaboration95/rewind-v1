import { afterEach, describe, expect, it, jest } from '@jest/globals';
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
  CameraRecordingController,
  CameraRecordingPort,
  CameraPreviewProps,
  CameraVideoCapture,
} from '../platform/camera/recording';
import type { HapticsPort } from '../platform/haptics/feedback';
import type {
  LocalVideoCaptureInput,
  LocalVideoCaptureStore,
} from '../features/capture/local-video-capture-store';
import type { VideoCaptureDependencies } from '../features/capture/video-capture-dependencies';

afterEach(() => {
  jest.useRealTimers();
});

function snapshot(status: CapabilityPermissionSnapshot['status']): CapabilityPermissionSnapshot {
  return {
    canAskAgain: status === 'denied' || status === 'undetermined',
    status,
  };
}

function createCapabilities(): CameraCapabilityPort {
  return {
    camera: {
      check: jest.fn(async () => snapshot('granted')),
      request: jest.fn(async () => snapshot('granted')),
    },
    microphone: {
      check: jest.fn(async () => snapshot('granted')),
      request: jest.fn(async () => snapshot('granted')),
    },
    settings: { open: jest.fn(async () => undefined) },
  };
}

function createContribution(): Contribution {
  return {
    capturedAt: '2026-08-30T10:00:00.000Z',
    cycleId: 'cycle-rewind-demo',
    deletedAt: null,
    durationSeconds: 2,
    id: 'contribution-new-video',
    localUri: 'file:///data/rewind-captures/contribution-new-video.mov',
    mediaKind: 'video',
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
      id: 'audit-capture',
      metadata: { action: 'capture.accepted', idempotent: false },
      subjectId: 'contribution-new-video',
      type: 'policy.capture.accepted',
    },
    idempotent: false,
    value: createContribution(),
  };
}

function createDependencies() {
  let resolveRecording!: (capture: CameraVideoCapture) => void;
  const controller: CameraRecordingController = {
    recordAsync: jest.fn(
      () =>
        new Promise<CameraVideoCapture>((resolve) => {
          resolveRecording = resolve;
        }),
    ),
    stopRecording: jest.fn(),
  };
  const Preview = ({ controllerRef, onCameraReady }: CameraPreviewProps) => {
    useEffect(() => {
      controllerRef.current = controller;
      onCameraReady();
      return () => {
        controllerRef.current = null;
      };
    }, [controllerRef, onCameraReady]);
    return <View testID="mock-camera-preview" />;
  };
  const store: LocalVideoCaptureStore = {
    discard: jest.fn(async (_sourceUri: string) => undefined),
    save: jest.fn(async (_input: LocalVideoCaptureInput) => acceptedSave()),
  };
  const haptics: HapticsPort = {
    trigger: jest.fn(async () => undefined),
  };
  const dependencies: VideoCaptureDependencies = {
    camera: { Preview } as CameraRecordingPort,
    haptics,
    store,
  };

  return {
    controller,
    dependencies,
    haptics,
    resolveRecording: (capture: CameraVideoCapture) => resolveRecording(capture),
    store,
  };
}

function renderVideoScreen(dependencies: VideoCaptureDependencies) {
  return render(
    <CameraScreen
      capabilities={createCapabilities()}
      captureDependencies={dependencies}
      mediaKind="video"
    />,
  );
}

describe('Local video capture', () => {
  it('shows a camera-ready vertical recorder with an accessible flip action', async () => {
    const { dependencies } = createDependencies();
    const view = await renderVideoScreen(dependencies);

    await waitFor(() => expect(view.getByTestId('video-record')).toBeTruthy());
    expect(
      view.getByText('Ready for a vertical local video. Maximum duration is 15 seconds.'),
    ).toBeTruthy();
    expect(view.getByTestId('video-capture-timer')).toHaveTextContent('00:00 / 00:15');

    await fireEvent.press(view.getByTestId('camera-flip'));
    expect(view.getByRole('button', { name: 'Use back camera' })).toBeTruthy();
  });

  it('exposes every original treatment as a selectable preview state', async () => {
    const { dependencies } = createDependencies();
    const view = await renderVideoScreen(dependencies);

    await waitFor(() => expect(view.getByTestId('video-record')).toBeTruthy());
    for (const treatment of [
      ['flash', 'FLASH'],
      ['ccd', 'CCD'],
      ['home-movie', 'HOME MOVIE'],
      ['tape', 'TAPE'],
    ] as const) {
      await fireEvent.press(view.getByTestId(`vignette-option-${treatment[0]}`));
      expect(view.getByTestId('vignette-selection')).toHaveTextContent(treatment[1]);
      expect(view.getByTestId('vignette-overlay')).toBeTruthy();
    }
  });

  it('stops, reviews, saves, and keeps the local URI out of visible UI', async () => {
    const { controller, dependencies, haptics, resolveRecording, store } = createDependencies();
    const view = await renderVideoScreen(dependencies);

    await waitFor(() => expect(view.getByTestId('video-record')).toBeTruthy());
    await fireEvent.press(view.getByTestId('vignette-option-tape'));
    expect(view.getByTestId('vignette-selection')).toHaveTextContent('TAPE');
    expect(view.getByTestId('vignette-overlay')).toBeTruthy();
    await fireEvent.press(view.getByTestId('video-record'));
    expect(controller.recordAsync).toHaveBeenCalledWith({ maxDurationSeconds: 15 });
    expect(haptics.trigger).toHaveBeenCalledWith('record');
    expect(view.getByTestId('video-stop')).toBeTruthy();

    await fireEvent.press(view.getByTestId('video-stop'));
    expect(controller.stopRecording).toHaveBeenCalledTimes(1);
    expect(haptics.trigger).toHaveBeenCalledWith('stop');
    await act(async () => {
      resolveRecording({ durationSeconds: 2, uri: 'file:///cache/synthetic-video.mov' });
      await Promise.resolve();
    });

    await waitFor(() => expect(view.getByTestId('video-save')).toBeTruthy());
    expect(
      view.getByText('Save the captured video locally or discard it and record again.'),
    ).toBeTruthy();
    await fireEvent.press(view.getByTestId('video-save'));

    await waitFor(() => expect(view.getByTestId('video-record-again')).toBeTruthy());
    expect(store.save).toHaveBeenCalledWith({
      capturedAt: expect.any(String),
      durationSeconds: 2,
      sourceUri: 'file:///cache/synthetic-video.mov',
      vignetteTreatment: 'tape',
    });
    expect(
      view.getByText(
        'The video was copied to local app storage. Review the capture below to submit.',
      ),
    ).toBeTruthy();
    expect(view.queryByText('file:///cache/synthetic-video.mov')).toBeNull();
  });

  it('allows discard and another recording before accepting a capture', async () => {
    const { controller, dependencies, store } = createDependencies();
    let resolveFirst!: (capture: CameraVideoCapture) => void;
    let resolveSecond!: (capture: CameraVideoCapture) => void;
    const firstRecording = new Promise<CameraVideoCapture>((resolve) => {
      resolveFirst = resolve;
    });
    const secondRecording = new Promise<CameraVideoCapture>((resolve) => {
      resolveSecond = resolve;
    });
    (controller.recordAsync as jest.Mock)
      .mockReturnValueOnce(firstRecording)
      .mockReturnValueOnce(secondRecording);
    const view = await renderVideoScreen(dependencies);

    await waitFor(() => expect(view.getByTestId('video-record')).toBeTruthy());
    await fireEvent.press(view.getByTestId('video-record'));
    await fireEvent.press(view.getByTestId('video-stop'));
    await act(async () => {
      resolveFirst({ durationSeconds: 2, uri: 'file:///cache/first-video.mov' });
      await Promise.resolve();
    });

    await waitFor(() => expect(view.getByTestId('video-discard')).toBeTruthy());
    await fireEvent.press(view.getByTestId('video-discard'));
    expect(store.discard).toHaveBeenCalledWith('file:///cache/first-video.mov');
    expect(view.getByTestId('video-record')).toBeTruthy();

    await fireEvent.press(view.getByTestId('video-record'));
    await fireEvent.press(view.getByTestId('video-stop'));
    await act(async () => {
      resolveSecond({ durationSeconds: 1, uri: 'file:///cache/second-video.mov' });
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByTestId('video-save')).toBeTruthy());
    expect(
      view.getByText('Save the captured video locally or discard it and record again.'),
    ).toBeTruthy();
  });

  it('keeps failed local writes actionable without exposing adapter errors', async () => {
    const { dependencies, resolveRecording, controller } = createDependencies();
    dependencies.store.save = jest.fn(async () => {
      throw new Error('native path details must stay private');
    });
    const view = await renderVideoScreen(dependencies);

    await waitFor(() => expect(view.getByTestId('video-record')).toBeTruthy());
    await fireEvent.press(view.getByTestId('video-record'));
    await fireEvent.press(view.getByTestId('video-stop'));
    await act(async () => {
      resolveRecording({ durationSeconds: 1, uri: 'file:///cache/synthetic-video.mov' });
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByTestId('video-save')).toBeTruthy());
    await fireEvent.press(view.getByTestId('video-save'));

    await waitFor(() => expect(view.getByTestId('video-capture-retry')).toBeTruthy());
    expect(view.getByText('The local video could not be saved. Record again.')).toBeTruthy();
    expect(view.queryByText('native path details must stay private')).toBeNull();
    expect(controller.recordAsync).toHaveBeenCalledTimes(1);
  });
});
