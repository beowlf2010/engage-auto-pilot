
interface HealthMetrics {
  connectionAttempts: number;
  connectionSuccesses: number;
  connectionFailures: number;
  consecutiveFailures: number;
  lastConnectionAttempt: Date | null;
  lastConnectionSuccess: Date | null;
  lastConnectionFailure: Date | null;
}

class ConnectionHealthService {
  private metrics: HealthMetrics = {
    connectionAttempts: 0,
    connectionSuccesses: 0,
    connectionFailures: 0,
    consecutiveFailures: 0,
    lastConnectionAttempt: null,
    lastConnectionSuccess: null,
    lastConnectionFailure: null
  };

  recordConnectionAttempt() {
    this.metrics.connectionAttempts++;
    this.metrics.lastConnectionAttempt = new Date();
    console.log('🔄 [CONNECTION HEALTH] Connection attempt recorded:', this.metrics.connectionAttempts);
  }

  recordConnectionSuccess() {
    this.metrics.connectionSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastConnectionSuccess = new Date();
    console.log('✅ [CONNECTION HEALTH] Connection success recorded');
  }

  recordConnectionFailure() {
    this.metrics.connectionFailures++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastConnectionFailure = new Date();
    console.log('❌ [CONNECTION HEALTH] Connection failure recorded, consecutive failures:', this.metrics.consecutiveFailures);
  }

  getHealthStatus() {
    const successRate = this.metrics.connectionAttempts > 0 
      ? this.metrics.connectionSuccesses / this.metrics.connectionAttempts 
      : 0;

    const isHealthy = this.metrics.consecutiveFailures < 3 && successRate > 0.5;
    
    // Determine network quality based on connection health
    let networkQuality: 'excellent' | 'good' | 'poor' | 'critical' = 'good';
    if (successRate > 0.9) {
      networkQuality = 'excellent';
    } else if (successRate > 0.7) {
      networkQuality = 'good';
    } else if (successRate > 0.3) {
      networkQuality = 'poor';
    } else {
      networkQuality = 'critical';
    }

    // Should use polling if connection quality is poor or we have too many failures
    const shouldUsePolling = !isHealthy || this.metrics.consecutiveFailures >= 3;

    return {
      ...this.metrics,
      successRate,
      isHealthy,
      networkQuality,
      shouldUsePolling
    };
  }

  reset() {
    this.metrics = {
      connectionAttempts: 0,
      connectionSuccesses: 0,
      connectionFailures: 0,
      consecutiveFailures: 0,
      lastConnectionAttempt: null,
      lastConnectionSuccess: null,
      lastConnectionFailure: null
    };
  }
}

export const connectionHealthService = new ConnectionHealthService();
