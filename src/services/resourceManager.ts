interface ResourceStatus {
  networkSpeed: 'fast' | 'medium' | 'slow';
  cpuUsage: number;
  memoryUsage: number;
  bandwidth: number;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  batteryLevel?: number;
  isOnline: boolean;
  connectionType?: string;
}

interface PerformanceMetrics {
  avgResponseTime: number;
  successRate: number;
  concurrentRequests: number;
  queueLength: number;
  lastMeasurement: Date;
}

class ResourceManager {
  private currentStatus: ResourceStatus = {
    networkSpeed: 'medium',
    cpuUsage: 0.5,
    memoryUsage: 0.5,
    bandwidth: 0,
    deviceType: 'desktop',
    isOnline: navigator.onLine
  };

  private performanceHistory: PerformanceMetrics[] = [];
  private measurementInterval: NodeJS.Timeout | null = null;
  private networkSpeedTests: number[] = [];
  private isMonitoring = false;

  constructor() {
    this.startMonitoring();
    this.detectDeviceType();
    this.setupNetworkListeners();
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('📊 [RESOURCE MANAGER] Starting resource monitoring');

    // Update resource status every 10 seconds
    this.measurementInterval = setInterval(() => {
      this.updateResourceStatus();
    }, 10000);

    // Immediate measurement
    this.updateResourceStatus();
  }

  private async updateResourceStatus() {
    try {
      // Update network status
      this.currentStatus.isOnline = navigator.onLine;
      
      // Measure network speed
      await this.measureNetworkSpeed();
      
      // Estimate CPU and memory usage
      this.estimateSystemResources();
      
      // Update battery status if available
      this.updateBatteryStatus();
      
      // Log status periodically
      this.logResourceStatus();
      
    } catch (error) {
      console.error('❌ [RESOURCE MANAGER] Error updating status:', error);
    }
  }

  private async measureNetworkSpeed() {
    const testStart = performance.now();
    const testSize = 100 * 1024; // 100KB test
    
    try {
      // Create a small test request to measure speed
      const testUrl = `data:application/octet-stream;base64,${btoa('x'.repeat(testSize))}`;
      const response = await fetch(testUrl);
      await response.blob();
      
      const testEnd = performance.now();
      const duration = testEnd - testStart;
      const speed = (testSize * 8) / (duration / 1000); // bits per second
      
      this.networkSpeedTests.push(speed);
      if (this.networkSpeedTests.length > 10) {
        this.networkSpeedTests.shift();
      }
      
      // Calculate average speed
      const avgSpeed = this.networkSpeedTests.reduce((a, b) => a + b, 0) / this.networkSpeedTests.length;
      this.currentStatus.bandwidth = avgSpeed;
      
      // Classify network speed
      if (avgSpeed > 5000000) { // > 5 Mbps
        this.currentStatus.networkSpeed = 'fast';
      } else if (avgSpeed > 1000000) { // > 1 Mbps
        this.currentStatus.networkSpeed = 'medium';
      } else {
        this.currentStatus.networkSpeed = 'slow';
      }
      
    } catch (error) {
      console.warn('⚠️ [RESOURCE MANAGER] Network speed test failed:', error);
      this.currentStatus.networkSpeed = 'medium'; // Default fallback
    }
  }

  private estimateSystemResources() {
    try {
      // Use performance API to estimate CPU usage
      const now = performance.now();
      const memory = (performance as any).memory;
      
      if (memory) {
        this.currentStatus.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      }
      
      // Estimate CPU usage based on frame rate and timing
      this.estimateCPUUsage();
      
    } catch (error) {
      console.warn('⚠️ [RESOURCE MANAGER] System resource estimation failed:', error);
    }
  }

  private estimateCPUUsage() {
    let frameCount = 0;
    const startTime = performance.now();
    
    const measureFrameRate = () => {
      frameCount++;
      const elapsed = performance.now() - startTime;
      
      if (elapsed >= 1000) { // Measure for 1 second
        const fps = frameCount;
        
        // Estimate CPU usage based on frame rate
        // 60 FPS = low CPU usage, 30 FPS = medium, <20 FPS = high
        if (fps >= 50) {
          this.currentStatus.cpuUsage = 0.2;
        } else if (fps >= 30) {
          this.currentStatus.cpuUsage = 0.5;
        } else {
          this.currentStatus.cpuUsage = 0.8;
        }
        
        return;
      }
      
      requestAnimationFrame(measureFrameRate);
    };
    
    requestAnimationFrame(measureFrameRate);
  }

  private async updateBatteryStatus() {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        this.currentStatus.batteryLevel = battery.level;
      }
    } catch (error) {
      // Battery API not available or not supported
    }
  }

  private detectDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.screen.width;
    
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(userAgent)) {
      this.currentStatus.deviceType = 'mobile';
    } else if (/tablet|ipad|android/i.test(userAgent) || screenWidth <= 1024) {
      this.currentStatus.deviceType = 'tablet';
    } else {
      this.currentStatus.deviceType = 'desktop';
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.currentStatus.isOnline = true;
      console.log('🌐 [RESOURCE MANAGER] Network connection restored');
    });

    window.addEventListener('offline', () => {
      this.currentStatus.isOnline = false;
      console.log('📴 [RESOURCE MANAGER] Network connection lost');
    });

    // Listen for connection type changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        this.currentStatus.connectionType = connection.effectiveType;
        
        // Adjust network speed based on connection type
        switch (connection.effectiveType) {
          case '4g':
            this.currentStatus.networkSpeed = 'fast';
            break;
          case '3g':
            this.currentStatus.networkSpeed = 'medium';
            break;
          case '2g':
          case 'slow-2g':
            this.currentStatus.networkSpeed = 'slow';
            break;
        }
      };
      
      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }
  }

  private logResourceStatus() {
    console.log('📊 [RESOURCE MANAGER] Status:', {
      network: `${this.currentStatus.networkSpeed} (${(this.currentStatus.bandwidth / 1000000).toFixed(1)} Mbps)`,
      cpu: `${(this.currentStatus.cpuUsage * 100).toFixed(0)}%`,
      memory: `${(this.currentStatus.memoryUsage * 100).toFixed(0)}%`,
      device: this.currentStatus.deviceType,
      online: this.currentStatus.isOnline,
      battery: this.currentStatus.batteryLevel ? `${(this.currentStatus.batteryLevel * 100).toFixed(0)}%` : 'unknown'
    });
  }

  // Get current resource status
  getResourceStatus(): ResourceStatus {
    return { ...this.currentStatus };
  }

  // Get performance-aware recommendations
  getLoadingRecommendations() {
    const recommendations = {
      maxConcurrentRequests: 3,
      prefetchEnabled: true,
      compressionEnabled: false,
      cacheSize: 'medium',
      backgroundLoadingEnabled: true
    };

    // Adjust based on network speed
    switch (this.currentStatus.networkSpeed) {
      case 'fast':
        recommendations.maxConcurrentRequests = 6;
        recommendations.prefetchEnabled = true;
        recommendations.cacheSize = 'large';
        break;
      case 'medium':
        recommendations.maxConcurrentRequests = 3;
        recommendations.prefetchEnabled = true;
        recommendations.cacheSize = 'medium';
        break;
      case 'slow':
        recommendations.maxConcurrentRequests = 1;
        recommendations.prefetchEnabled = false;
        recommendations.cacheSize = 'small';
        recommendations.compressionEnabled = true;
        break;
    }

    // Adjust based on CPU usage
    if (this.currentStatus.cpuUsage > 0.8) {
      recommendations.maxConcurrentRequests = Math.max(1, recommendations.maxConcurrentRequests - 2);
      recommendations.backgroundLoadingEnabled = false;
    }

    // Adjust based on memory usage
    if (this.currentStatus.memoryUsage > 0.8) {
      recommendations.cacheSize = 'small';
      recommendations.prefetchEnabled = false;
    }

    // Adjust based on device type
    if (this.currentStatus.deviceType === 'mobile') {
      recommendations.maxConcurrentRequests = Math.min(2, recommendations.maxConcurrentRequests);
      recommendations.compressionEnabled = true;
    }

    // Adjust based on battery level
    if (this.currentStatus.batteryLevel && this.currentStatus.batteryLevel < 0.2) {
      recommendations.backgroundLoadingEnabled = false;
      recommendations.prefetchEnabled = false;
    }

    return recommendations;
  }

  // Check if loading should be throttled
  shouldThrottleLoading(): boolean {
    return (
      this.currentStatus.networkSpeed === 'slow' ||
      this.currentStatus.cpuUsage > 0.8 ||
      this.currentStatus.memoryUsage > 0.8 ||
      !this.currentStatus.isOnline ||
      (this.currentStatus.batteryLevel && this.currentStatus.batteryLevel < 0.15)
    );
  }

  // Get optimal chunk size for data loading
  getOptimalChunkSize(): number {
    switch (this.currentStatus.networkSpeed) {
      case 'fast': return 200; // Load 200 messages at once
      case 'medium': return 100; // Load 100 messages at once
      case 'slow': return 50; // Load 50 messages at once
      default: return 100;
    }
  }

  // Track performance metrics
  trackPerformance(responseTime: number, success: boolean) {
    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    
    if (!latest || Date.now() - latest.lastMeasurement.getTime() > 60000) {
      // Create new measurement
      this.performanceHistory.push({
        avgResponseTime: responseTime,
        successRate: success ? 1 : 0,
        concurrentRequests: 1,
        queueLength: 0,
        lastMeasurement: new Date()
      });
    } else {
      // Update existing measurement
      latest.avgResponseTime = (latest.avgResponseTime + responseTime) / 2;
      latest.successRate = (latest.successRate + (success ? 1 : 0)) / 2;
    }

    // Keep only last 60 measurements
    if (this.performanceHistory.length > 60) {
      this.performanceHistory.shift();
    }
  }

  // Get performance insights
  getPerformanceInsights() {
    if (this.performanceHistory.length === 0) {
      return {
        avgResponseTime: 0,
        successRate: 1,
        trend: 'stable',
        recommendation: 'Insufficient data'
      };
    }

    const recent = this.performanceHistory.slice(-10);
    const avgResponseTime = recent.reduce((sum, m) => sum + m.avgResponseTime, 0) / recent.length;
    const avgSuccessRate = recent.reduce((sum, m) => sum + m.successRate, 0) / recent.length;

    let trend = 'stable';
    if (recent.length >= 5) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, m) => sum + m.avgResponseTime, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, m) => sum + m.avgResponseTime, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.2) {
        trend = 'degrading';
      } else if (secondAvg < firstAvg * 0.8) {
        trend = 'improving';
      }
    }

    let recommendation = 'Performance is optimal';
    if (avgResponseTime > 2000) {
      recommendation = 'Consider reducing concurrent requests';
    } else if (avgSuccessRate < 0.9) {
      recommendation = 'Network issues detected, enable retry logic';
    }

    return {
      avgResponseTime,
      successRate: avgSuccessRate,
      trend,
      recommendation
    };
  }

  stop() {
    this.isMonitoring = false;
    if (this.measurementInterval) {
      clearInterval(this.measurementInterval);
      this.measurementInterval = null;
    }
    console.log('🛑 [RESOURCE MANAGER] Stopped monitoring');
  }
}

export const resourceManager = new ResourceManager();
