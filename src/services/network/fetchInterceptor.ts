// Global fetch interceptor to detect 502/503/504 and network issues
// Dispatches 'network-issue' and 'network-health-changed' events

// Only run in browser
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);

  const state = {
    issues: [] as Array<{ status?: number; message?: string; url?: string; method?: string; at: number }>,
    isDegraded: false,
    lastIssueAt: 0,
  };

  const pushIssue = (issue: { status?: number; message?: string; url?: string; method?: string }) => {
    const entry = { ...issue, at: Date.now() };
    state.issues.unshift(entry);
    if (state.issues.length > 20) state.issues.pop();
    state.isDegraded = true;
    state.lastIssueAt = entry.at;

    window.dispatchEvent(new CustomEvent('network-issue', { detail: entry }));
    window.dispatchEvent(new CustomEvent('network-health-changed', { detail: { isDegraded: true, lastIssueAt: state.lastIssueAt } }));
  };

  // Recover from degraded after quiet period
  const maybeRecover = () => {
    const QUIET_MS = 60_000; // 1 minute
    if (state.isDegraded && Date.now() - state.lastIssueAt > QUIET_MS) {
      state.isDegraded = false;
      window.dispatchEvent(new CustomEvent('network-health-changed', { detail: { isDegraded: false, lastIssueAt: state.lastIssueAt } }));
    }
  };
  setInterval(maybeRecover, 15_000);

  // Listen to online/offline to reset degraded state
  window.addEventListener('online', () => {
    state.isDegraded = false;
    window.dispatchEvent(new CustomEvent('network-health-changed', { detail: { isDegraded: false, lastIssueAt: state.lastIssueAt } }));
  });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const res = await originalFetch(input, init);
      if ([502, 503, 504].includes(res.status)) {
        pushIssue({ status: res.status, url: typeof input === 'string' ? input : (input as URL).toString(), method: init?.method || 'GET' });
      }
      return res;
    } catch (e: any) {
      // Network error (e.g., TypeError: Failed to fetch)
      pushIssue({ message: e?.message || 'Network error', url: typeof input === 'string' ? input : (input as URL).toString(), method: init?.method || 'GET' });
      throw e;
    }
  };
}

export {};