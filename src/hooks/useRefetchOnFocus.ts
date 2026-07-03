import { useEffect, useRef } from 'react';

/**
 * Re-runs `callback` when the tab regains focus/visibility, so data loaded
 * once on mount doesn't go stale for the rest of a long-lived session (e.g.
 * a warehouse operator leaving the page open all day while others edit the
 * same records elsewhere).
 *
 * Throttled by `minIntervalMs` so rapid alt-tabbing doesn't spam refetches.
 */
export function useRefetchOnFocus(
  callback: () => void,
  minIntervalMs = 15000
) {
  const callbackRef = useRef(callback);
  const lastRunRef = useRef(0);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    lastRunRef.current = Date.now();

    const maybeRefetch = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) return;
      lastRunRef.current = now;
      callbackRef.current();
    };

    window.addEventListener('focus', maybeRefetch);
    document.addEventListener('visibilitychange', maybeRefetch);

    return () => {
      window.removeEventListener('focus', maybeRefetch);
      document.removeEventListener('visibilitychange', maybeRefetch);
    };
  }, [minIntervalMs]);
}
