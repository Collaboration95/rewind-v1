import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CameraScreen from '../app/(tabs)/camera';
import type {
  CapabilityPermissionSnapshot,
  CameraCapabilityPort,
  PermissionPort,
} from '../platform/camera/permissions';

function snapshot(status: CapabilityPermissionSnapshot['status']): CapabilityPermissionSnapshot {
  return {
    canAskAgain: status === 'denied' || status === 'undetermined',
    status,
  };
}

function createCapabilities(
  cameraStatus: CapabilityPermissionSnapshot['status'],
  microphoneStatus: CapabilityPermissionSnapshot['status'] = 'granted',
) {
  let camera = snapshot(cameraStatus);
  let microphone = snapshot(microphoneStatus);
  const cameraPort: PermissionPort = {
    check: jest.fn(async () => camera),
    request: jest.fn(async () => {
      camera = snapshot('granted');
      return camera;
    }),
  };
  const microphonePort: PermissionPort = {
    check: jest.fn(async () => microphone),
    request: jest.fn(async () => {
      microphone = snapshot('granted');
      return microphone;
    }),
  };
  const openSettings = jest.fn(async () => undefined);

  const capabilities: CameraCapabilityPort = {
    camera: cameraPort,
    microphone: microphonePort,
    settings: { open: openSettings },
  };

  return { cameraPort, capabilities, microphonePort, openSettings };
}

describe('Camera permission preflight', () => {
  it('keeps a stable loading region before showing the ready photo state', async () => {
    let releaseCameraCheck!: (value: CapabilityPermissionSnapshot) => void;
    const cameraCheck = new Promise<CapabilityPermissionSnapshot>((resolve) => {
      releaseCameraCheck = resolve;
    });
    const capabilities: CameraCapabilityPort = {
      camera: {
        check: jest.fn(() => cameraCheck),
        request: jest.fn(async () => snapshot('granted')),
      },
      microphone: {
        check: jest.fn(async () => snapshot('granted')),
        request: jest.fn(async () => snapshot('granted')),
      },
      settings: { open: jest.fn(async () => undefined) },
    };

    const view = await render(
      <CameraScreen capabilities={capabilities} mediaKind="photo" showCapture={false} />,
    );

    expect(view.getByTestId('camera-permission-loading')).toBeTruthy();
    releaseCameraCheck(snapshot('granted'));
    await waitFor(() => expect(view.getByTestId('camera-permission-ready')).toBeTruthy());
    expect(view.getByText('Camera access is ready for a local photo.')).toBeTruthy();
  });

  it('requests camera access and then exposes the ready state', async () => {
    const { cameraPort, capabilities } = createCapabilities('undetermined');
    const view = await render(
      <CameraScreen capabilities={capabilities} mediaKind="photo" showCapture={false} />,
    );

    await waitFor(() => expect(view.getByTestId('camera-permission-action')).toBeTruthy());
    expect(view.getByText('Allow camera access to continue with a local photo.')).toBeTruthy();

    await fireEvent.press(view.getByTestId('camera-permission-action'));

    await waitFor(() => expect(view.getByTestId('camera-permission-ready')).toBeTruthy());
    expect(cameraPort.request).toHaveBeenCalledTimes(1);
  });

  it('distinguishes retryable denial from a blocked permission', async () => {
    const denied = createCapabilities('denied');
    const deniedView = await render(
      <CameraScreen capabilities={denied.capabilities} mediaKind="photo" showCapture={false} />,
    );

    await waitFor(() =>
      expect(
        deniedView.getByText('Camera access was denied. Try the permission again.'),
      ).toBeTruthy(),
    );
    expect(deniedView.getByRole('button', { name: 'Retry camera permission' })).toBeTruthy();
    await fireEvent.press(deniedView.getByRole('button', { name: 'Retry camera permission' }));
    await waitFor(() => expect(deniedView.getByTestId('camera-permission-ready')).toBeTruthy());

    const blocked = createCapabilities('blocked');
    const blockedView = await render(
      <CameraScreen capabilities={blocked.capabilities} mediaKind="photo" showCapture={false} />,
    );

    await waitFor(() => expect(blockedView.getByTestId('camera-permission-settings')).toBeTruthy());
    await fireEvent.press(blockedView.getByTestId('camera-permission-settings'));
    expect(blocked.openSettings).toHaveBeenCalledTimes(1);
    expect(blockedView.getByTestId('camera-permission-check')).toBeTruthy();
  });

  it('requires microphone access only after switching to video', async () => {
    const { capabilities, microphonePort } = createCapabilities('granted', 'undetermined');
    const view = await render(
      <CameraScreen capabilities={capabilities} mediaKind="photo" showCapture={false} />,
    );

    await waitFor(() => expect(view.getByTestId('camera-permission-ready')).toBeTruthy());
    await fireEvent.press(view.getByTestId('camera-media-video'));

    await waitFor(() =>
      expect(
        view.getByText('Allow microphone access to continue with a local video.'),
      ).toBeTruthy(),
    );
    expect(view.getByRole('button', { name: 'Allow microphone permission' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Allow microphone permission' }));
    await waitFor(() => expect(view.getByTestId('camera-permission-ready')).toBeTruthy());
    expect(microphonePort.request).toHaveBeenCalledTimes(1);
    expect(view.getByText('Camera and microphone access are ready for local video.')).toBeTruthy();
  });

  it('keeps unsupported hardware actionable without presenting recording controls', async () => {
    const { capabilities } = createCapabilities('unsupported');
    const view = await render(
      <CameraScreen capabilities={capabilities} mediaKind="photo" showCapture={false} />,
    );

    await waitFor(() =>
      expect(view.getByText('Camera access is not available on this device.')).toBeTruthy(),
    );
    expect(view.getByTestId('camera-permission-retry')).toBeTruthy();
    expect(view.queryByText('RECORD')).toBeNull();
    expect(view.getByText('LOCAL PERMISSION CHECK · NO RECORDING IN THIS SLICE')).toBeTruthy();
  });
});
