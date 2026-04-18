import { useEffect, useState } from 'react';

/**
 * Device performance tier.
 *
 * - `high`: modern iPhone (A13+) / high-end Android → full glass + blur
 * - `medium`: mid-range or unknown → full glass but skip fancy blurs on lists
 * - `low`: older iPhone (A12 and older) / low-memory Android → fall back to
 *   solid surfaces (backdrop-filter is expensive on older GPUs)
 */
export type DevicePerformanceTier = 'high' | 'medium' | 'low';

type ReduceTransparencyPreference = 'auto' | 'on' | 'off';

const REDUCE_KEY = 'brikly.a11y.reduceTransparency';

/**
 * Conservative model-based downgrade for older iPhones. Detection is a
 * best-effort heuristic; real devices should be confirmed by the GPU tier
 * fallback (deviceMemory + hardwareConcurrency).
 */
function isOlderIPhone(ua: string): boolean {
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  // iPhone OS versions: iOS 11..13 era devices generally shipped A9..A12
  // We only flag *very* old iOS versions; iOS 15+ shipped on A12+ only,
  // so anything running iOS <= 14 is a safe downgrade candidate.
  const match = ua.match(/OS (\d+)_/);
  if (!match) return false;
  const major = Number.parseInt(match[1], 10);
  return Number.isFinite(major) && major <= 14;
}

function detectTier(): DevicePerformanceTier {
  if (typeof navigator === 'undefined') return 'medium';
  const ua = navigator.userAgent;

  // Explicit downgrade path for older iPhones/iPads
  if (isOlderIPhone(ua)) return 'low';

  // navigator.deviceMemory is in GB (Chromium, Safari 17+ partial)
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;

  if (typeof memory === 'number' && memory <= 2) return 'low';
  if (typeof cores === 'number' && cores <= 2) return 'low';
  if (typeof memory === 'number' && memory <= 4) return 'medium';
  if (typeof cores === 'number' && cores <= 4) return 'medium';

  return 'high';
}

function readPreference(): ReduceTransparencyPreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const v = window.localStorage.getItem(REDUCE_KEY);
    if (v === 'on' || v === 'off') return v;
    return 'auto';
  } catch {
    return 'auto';
  }
}

function writePreference(value: ReduceTransparencyPreference) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REDUCE_KEY, value);
  } catch {
    // ignore
  }
}

/**
 * Apply / remove the `low-gpu` class on <html> so CSS can degrade glass
 * surfaces to solid ones on older devices. Also respects an explicit
 * `Reduce transparency` user preference (auto | on | off).
 */
function applyLowGpu(shouldReduce: boolean) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.classList.toggle('low-gpu', shouldReduce);
}

/**
 * Hook that returns the current device performance tier and the effective
 * `reduceTransparency` state (auto-detected or user override). Keeps the
 * `low-gpu` class on <html> in sync so CSS can flatten glass surfaces.
 */
export function useDevicePerformance() {
  const [tier, setTier] = useState<DevicePerformanceTier>(() => detectTier());
  const [preference, setPreference] = useState<ReduceTransparencyPreference>(() =>
    readPreference(),
  );

  useEffect(() => {
    const reduce =
      preference === 'on' || (preference === 'auto' && tier === 'low');
    applyLowGpu(reduce);
  }, [tier, preference]);

  useEffect(() => {
    // Re-evaluate once if userAgent/memory change (unlikely but safe).
    setTier(detectTier());
  }, []);

  const reduceTransparency =
    preference === 'on' || (preference === 'auto' && tier === 'low');

  const setReduceTransparency = (value: ReduceTransparencyPreference) => {
    writePreference(value);
    setPreference(value);
  };

  return {
    tier,
    reduceTransparency,
    preference,
    setReduceTransparency,
  };
}

/**
 * Module-level initializer: sets the initial `low-gpu` class synchronously
 * on first import so the very first paint is already flattened on older
 * devices. Safe to call from app bootstrap (main.tsx).
 */
export function initDevicePerformance() {
  if (typeof document === 'undefined') return;
  const preference = readPreference();
  const tier = detectTier();
  const reduce =
    preference === 'on' || (preference === 'auto' && tier === 'low');
  applyLowGpu(reduce);
}
