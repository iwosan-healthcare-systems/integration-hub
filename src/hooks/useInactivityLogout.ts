import { useEffect, useRef } from 'react';

const TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

/**
 * Logs out Azure-authenticated users after 1 hour of inactivity.
 * Only active when `enabled` is true (i.e. user.authProvider === 'azure').
 */
export function useInactivityLogout(onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onTimeout);
  callbackRef.current = onTimeout;

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(), TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // start the timer immediately on mount

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled]);
}
