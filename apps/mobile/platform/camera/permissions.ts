export type CapabilityPermissionStatus =
  'blocked' | 'denied' | 'granted' | 'undetermined' | 'unsupported';

export type CameraPermissionResource = 'camera' | 'microphone';

export interface CapabilityPermissionSnapshot {
  readonly canAskAgain: boolean;
  readonly status: CapabilityPermissionStatus;
}

export interface PermissionPort {
  check(): Promise<CapabilityPermissionSnapshot>;
  request(): Promise<CapabilityPermissionSnapshot>;
}

export interface CameraCapabilityPort {
  readonly camera: PermissionPort;
  readonly microphone: PermissionPort;
  readonly settings: {
    open(): Promise<void>;
  };
}
