/**
 * Deduplicated session refresh state shared by the API client.
 *
 * AUTH-012: concurrent 401s share a single in-flight refresh instead of
 * triggering multiple refresh storms.
 */
let refreshPromise: Promise<boolean> | null = null;

type SessionExpiredHandler = () => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler): void {
  sessionExpiredHandler = handler;
}

export function getSessionExpiredHandler(): SessionExpiredHandler | null {
  return sessionExpiredHandler;
}

export function clearSessionExpiredHandler(): void {
  sessionExpiredHandler = null;
}

/** Emitted once refresh is known to have failed permanently (AUTH-013). */
export function notifySessionExpired(): void {
  sessionExpiredHandler?.();
}

/** Runs at most one refresh at a time; concurrent callers await the same promise. */
export function refreshSession(fetchFn: () => Promise<boolean>): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        return await fetchFn();
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}