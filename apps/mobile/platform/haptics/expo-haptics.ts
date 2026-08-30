import * as Haptics from 'expo-haptics';

import type { HapticsPort } from './feedback';

export function createExpoHapticsPort(): HapticsPort {
  return {
    async trigger(cue) {
      try {
        if (cue === 'locked') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }

        await Haptics.impactAsync(
          cue === 'record' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
        );
      } catch {
        // Haptics are a cue, never a prerequisite for the local capture flow.
      }
    },
  };
}
