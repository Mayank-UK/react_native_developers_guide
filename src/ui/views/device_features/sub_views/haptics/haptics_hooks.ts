import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';

/**
 * Haptics — view logic. expo-haptics drives the Taptic Engine (iOS) / the
 * vibrator (Android). Three primitives cover every standard case: a weighted
 * impact, a semantic notification, and a tiny selection tick. `HAPTIC_OPTIONS`
 * is the SSOT the UI lists; this hook is the only place that maps a key to the
 * real native call.
 */

/**
 * The set of haptic effects the LIVE demo can fire. A const-object + literal
 * union (NOT an `enum`) so it survives `erasableSyntaxOnly`; the hook maps each
 * key to the real `Haptics.*` call. Cited verbatim by the view's <Code> block.
 */
export const HAPTIC_OPTIONS = {
  impactLight: 'Impact · Light',
  impactMedium: 'Impact · Medium',
  impactHeavy: 'Impact · Heavy',
  notificationSuccess: 'Notification · Success',
  notificationWarning: 'Notification · Warning',
  notificationError: 'Notification · Error',
  selection: 'Selection',
} as const;

export type HapticKind = keyof typeof HAPTIC_OPTIONS;

export interface HapticsDemo {
  /** Fire a haptic of the given kind and record it in `last`. */
  trigger: (kind: HapticKind) => void;
  /** Human label of the most recently fired haptic (null before first fire). */
  last: string | null;
}

/**
 * Wraps `expo-haptics`. Fire-and-forget: haptics are best-effort (the device
 * may not support them, e.g. Android emulators). Each call resolves void on
 * completion.
 */
export function useHapticsDemo(): HapticsDemo {
  const [last, setLast] = useState<string | null>(null);

  const trigger = useCallback((kind: HapticKind) => {
    void (async () => {
      switch (kind) {
        case 'impactLight':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'impactMedium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'impactHeavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'notificationSuccess':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'notificationWarning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'notificationError':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
      }
      setLast(HAPTIC_OPTIONS[kind]);
    })();
  }, []);

  return { trigger, last };
}
