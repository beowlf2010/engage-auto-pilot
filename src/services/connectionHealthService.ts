
interface ConnectionMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  averageLatency: number;
  lastSuccessfulConnection: Date | null;
  consecutiveFailures: number;
  networkQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

class ConnectionHealthService {
  private metrics: ConnectionMetrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageLatency: 0,
    lastSuccessfulConnection: null,
    consecutiveFailures: 0,
    networkQuality: 'good'
  };

  private latencyHistory: number[] = [];
  private maxHistoryLength = 10;

  recordConnectionAttempt() {
    this.metrics.connectionAttempts++;
    console.log('🔄 [CONNECTION HEALTH] Connection attempt recorded:', this.metrics.connectionAttempts);
  }

  recordConnectionSuccess(latency?: number) {
    this.metrics.successfulConnections++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessfulConnection = new Date();
    
    if (latency) {
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > this.maxHistoryLength) {
        this.latencyHistory.shift();
      }
      this.metrics.averageLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
    }

    this.updateNetworkQuality();
    console.log('✅ [CONNECTION HEALTH] Connection success recorded');
  }

  recordConnectionFailure() {
    this.metrics.failedConnections++;
    this.metrics.consecutiveFailures++;
    this.updateNetworkQuality();
    console.log('❌ [CONNECTION HEALTH] Connection failure recorded, consecutive failures:', this.metrics.consecutiveFailures);
  }

  private updateNetworkQuality() {
    const successRate = this.metrics.connectionAttempts > 0 
      ? this.metrics.successfulConnections / this.metrics.connectionAttempts 
      : 0;

    if (this.metrics.consecutiveFailures >= 5) {
      this.metrics.networkQuality = 'critical';
    } else if (this.metrics.consecutiveFailures >= 3 || successRate < 0.5) {
      this.metrics.networkQuality = 'poor';
    } else if (successRate < 0.8 || this.metrics.averageLatency > 2000) {
      this.metrics.networkQuality = 'good';
    } else {
      this.metrics.networkQuality = 'excellent';
    }
  }

  getHealthStatus() {
    return {
      ...this.metrics,
      healthScore: this.calculateHealthScore(),
      shouldUsePolling: this.shouldFallbackToPolling(),
      recommendedAction: this.getRecommendedAction()
    };
  }

  private calculateHealthScore(): number {
    const successRate = this.metrics.connectionAttempts > 0 
      ? this.metrics.successfulConnections / this.metrics.connectionAttempts 
      : 1;
    
    const latencyScore = Math.max(0, 1 - (this.metrics.averageLatency / 5000));
    const failureScore = Math.max(0, 1 - (this.metrics.consecutiveFailures / 10));
    
    return Math.round((successRate * 0.5 + latencyScore * 0.3 + failureScore * 0.2) * 100);
  }

  shouldFallbackToPolling(): boolean {
    return this.metrics.consecutiveFailures >= 3 || 
           this.metrics.networkQuality === 'critical';
  }

  private getRecommendedAction(): string {
    if (this.metrics.consecutiveFailures >= 5) {
      return 'Switch to polling mode and check network connection';
    } else if (this.metrics.consecutiveFailures >= 3) {
      return 'Reduce connection frequency and implement backoff';
    } else if (this.metrics.averageLatency > 3000) {
      return 'Monitor network quality and consider timeout adjustments';
    }
    return 'Connection healthy';
  }

  reset() {
    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageLatency: 0,
      lastSuccessfulConnection: null,
      consecutiveFailures: 0,
      networkQuality: 'good'
    };
    this.latencyHistory = [];
  }
}

export const connectionHealthService = new ConnectionHealthService();
