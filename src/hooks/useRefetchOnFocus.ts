// Hook that re-runs a callback when the tab regains focus or visibility,
// throttled by a minimum interval between runs.
import { useEffect, useRef } from 'react';

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
