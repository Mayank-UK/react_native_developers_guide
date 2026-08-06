import { useCallback, useEffect, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

/**
 * Sensors — view logic. expo-sensors streams high-frequency device-motion data
 * (accelerometer, gyroscope, magnetometer, barometer) via a subscription model:
 * `setUpdateInterval(ms)` sets the cadence, `addListener(cb)` returns a
 * subscription whose `.remove()` tears it down. This hook demonstrates the
 * accelerometer and exposes an update-interval picker + a pause/resume toggle
 * so the live card can show the stream shape.
 *
 * Reusable across the other sensors — swap `Accelerometer` for `Gyroscope` /
 * `Magnetometer` and the body is identical (the package exposes the same shape
 * for each).
 */

/** The cadence options surfaced in the UI (ms between samples). */
export const UPDATE_INTERVALS = {
  ui: 500,
  game: 100,
  fastest: 16,
} as const;

export type UpdateInterval = keyof typeof UPDATE_INTERVALS;

export interface AccelReading {
  x: number;
  y: number;
  z: number;
}

export interface AccelerometerDemo {
  /** Latest accelerometer reading, or null before the first sample arrives. */
  reading: AccelReading | null;
  /** Whether the subscription is currently active (paused ↔ resumed). */
  active: boolean;
  /** Currently selected cadence key. */
  interval: UpdateInterval;
  /** Switch to a different cadence (applies live to the subscription). */
  setInterval: (next: UpdateInterval) => void;
  /** Pause the subscription (keeps the last reading). */
  pause: () => void;
  /** Resume the subscription. */
  resume: () => void;
}

/**
 * Wraps `expo-sensors` Accelerometer. The subscription is created in an effect
 * and torn down on unmount or when cadence/active changes; update interval is
 * applied before each subscription so the new cadence takes effect immediately.
 * No `any`; strict + erasure-clean.
 */
export function useAccelerometerDemo(): AccelerometerDemo {
  const [reading, setReading] = useState<AccelReading | null>(null);
  const [active, setActive] = useState(true);
  const [interval, setIntervalKey] = useState<UpdateInterval>('ui');

  // Apply the cadence whenever it changes (the package reads it at subscription
  // time + on subsequent setUpdateInterval calls).
  useEffect(() => {
    Accelerometer.setUpdateInterval(UPDATE_INTERVALS[interval]);
  }, [interval]);

  // Subscribe while active; tear down on pause / cadence change / unmount.
  useEffect(() => {
    if (!active) return;
    const sub = Accelerometer.addListener((data) => {
      setReading({ x: data.x, y: data.y, z: data.z });
    });
    return () => {
      sub.remove();
    };
  }, [active]);

  const pause = useCallback(() => setActive(false), []);
  const resume = useCallback(() => setActive(true), []);

  return {
    reading,
    active,
    interval,
    setInterval: setIntervalKey,
    pause,
    resume,
  };
}
