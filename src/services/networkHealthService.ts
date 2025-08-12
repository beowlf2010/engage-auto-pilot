interface HealthDetail {
  isDegraded?: boolean;
  lastIssueAt?: number;
  source?: string;
}

class NetworkHealthService {
  private degraded = false;
  private resetTimer: number | undefined;
  private readonly holdMs = 20000; // keep degraded state visible for 20s after a timeout

  private dispatchHealth(detail: HealthDetail) {
    const event = new CustomEvent('network-health-changed', { detail });
    window.dispatchEvent(event);
  }

  private dispatchIssue() {
    const event = new CustomEvent('network-issue', { detail: { at: Date.now() } });
    window.dispatchEvent(event);
  }

  private scheduleReset() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.resetTimer = window.setTimeout(() => {
      this.degraded = false;
      this.dispatchHealth({ isDegraded: false, lastIssueAt: Date.now() });
    }, this.holdMs);
  }

  reportTimeout(source?: string) {
    this.degraded = true;
    this.dispatchHealth({ isDegraded: true, lastIssueAt: Date.now(), source });
    this.dispatchIssue();
    this.scheduleReset();
  }

  reportSuccess() {
    // Do not instantly clear degraded to avoid flicker; rely on scheduled reset.
    // Optionally extend the reset if successes continue.
  }

  getHealthStatus() {
    return { isDegraded: this.degraded };
  }
}

export const networkHealthService = new NetworkHealthService();
