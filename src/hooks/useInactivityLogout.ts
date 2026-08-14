import { useEffect, useRef, useState } from 'react';

export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const TICK_MS = 1000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

/**
 * Logs out the current user after 1 hour of inactivity.
 * Only active when `enabled` is true (i.e. a user is signed in).
 * Returns the time remaining until logout (ms), ticking down once a second,
 * so callers can surface a visible countdown.
 */
export function useInactivityLogout(onTimeout: () => void, enabled: boolean): number {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef(Date.now() + INACTIVITY_TIMEOUT_MS);
  const callbackRef = useRef(onTimeout);
  callbackRef.current = onTimeout;
  const [remainingMs, setRemainingMs] = useState(INACTIVITY_TIMEOUT_MS);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      deadlineRef.current = Date.now() + INACTIVITY_TIMEOUT_MS;
      setRemainingMs(INACTIVITY_TIMEOUT_MS);
      timerRef.current = setTimeout(() => callbackRef.current(), INACTIVITY_TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // start the timer immediately on mount

    tickRef.current = setInterval(() => {
      setRemainingMs(Math.max(0, deadlineRef.current - Date.now()));
    }, TICK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [enabled]);

  return enabled ? remainingMs : INACTIVITY_TIMEOUT_MS;
}
