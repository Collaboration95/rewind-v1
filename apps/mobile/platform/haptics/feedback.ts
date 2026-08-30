export type HapticCue = 'locked' | 'record' | 'stop';

export interface HapticsPort {
  trigger(cue: HapticCue): Promise<void>;
}
