import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { securityLogger } from '@/utils/securityMiddleware';

interface SecurityMonitorConfig {
  failedLoginThreshold: number;
  rateLimitThreshold: number;
  xssAttemptThreshold: number;
  timeWindowMs: number;
  enableRealTimeAlerts: boolean;
}

interface ThreatDetection {
  type: 'brute_force' | 'rate_limit_abuse' | 'xss_attack' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
  timestamp: number;
}

class SecurityMonitor {
  private config: SecurityMonitorConfig;
  private eventCache: Map<string, any[]> = new Map();
  private alertCallbacks: ((threat: ThreatDetection) => void)[] = [];

  constructor(config: Partial<SecurityMonitorConfig> = {}) {
    this.config = {
      failedLoginThreshold: 5,
      rateLimitThreshold: 10,
      xssAttemptThreshold: 3,
      timeWindowMs: 300000, // 5 minutes
      enableRealTimeAlerts: true,
      ...config
    };
  }

  // Add threat detection callback
  onThreatDetected(callback: (threat: ThreatDetection) => void) {
    this.alertCallbacks.push(callback);
  }

  // Analyze security events for threats
  analyzeEvent(event: any) {
    const eventType = event.action;
    const timestamp = Date.now();
    const identifier = event.details?.ip || event.user_id || 'unknown';

    // Store event in cache
    if (!this.eventCache.has(identifier)) {
      this.eventCache.set(identifier, []);
    }
    
    const userEvents = this.eventCache.get(identifier)!;
    userEvents.push({ ...event, timestamp });

    // Clean old events
    const cutoff = timestamp - this.config.timeWindowMs;
    this.eventCache.set(identifier, userEvents.filter(e => e.timestamp > cutoff));

    // Detect threats
    this.detectBruteForce(identifier, userEvents);
    this.detectRateLimitAbuse(identifier, userEvents);
    this.detectXSSAttacks(identifier, userEvents);
    this.detectSuspiciousPatterns(identifier, userEvents);
  }

  private detectBruteForce(identifier: string, events: any[]) {
    const failedLogins = events.filter(e => e.action === 'failed_login_attempt');
    
    if (failedLogins.length >= this.config.failedLoginThreshold) {
      this.emitThreat({
        type: 'brute_force',
        severity: 'high',
        description: `${failedLogins.length} failed login attempts from ${identifier}`,
        metadata: {
          identifier,
          attempts: failedLogins.length,
          timespan: this.config.timeWindowMs,
          lastAttempt: failedLogins[failedLogins.length - 1]
        },
        timestamp: Date.now()
      });
    }
  }

  private detectRateLimitAbuse(identifier: string, events: any[]) {
    const rateLimitEvents = events.filter(e => e.action === 'rate_limit_exceeded');
    
    if (rateLimitEvents.length >= this.config.rateLimitThreshold) {
      this.emitThreat({
        type: 'rate_limit_abuse',
        severity: 'medium',
        description: `Excessive rate limit violations from ${identifier}`,
        metadata: {
          identifier,
          violations: rateLimitEvents.length,
          endpoints: [...new Set(rateLimitEvents.map(e => e.details?.endpoint))]
        },
        timestamp: Date.now()
      });
    }
  }

  private detectXSSAttacks(identifier: string, events: any[]) {
    const xssEvents = events.filter(e => e.action === 'xss_attempt');
    
    if (xssEvents.length >= this.config.xssAttemptThreshold) {
      this.emitThreat({
        type: 'xss_attack',
        severity: 'critical',
        description: `Multiple XSS attempts detected from ${identifier}`,
        metadata: {
          identifier,
          attempts: xssEvents.length,
          payloads: xssEvents.map(e => e.details?.payload).filter(Boolean)
        },
        timestamp: Date.now()
      });
    }
  }

  private detectSuspiciousPatterns(identifier: string, events: any[]) {
    // Detect rapid sequential unauthorized access attempts
    const unauthorizedEvents = events.filter(e => 
      e.action.includes('unauthorized') || 
      e.action.includes('invalid_authentication')
    );

    if (unauthorizedEvents.length >= 3) {
      const timeSpan = unauthorizedEvents[unauthorizedEvents.length - 1].timestamp - unauthorizedEvents[0].timestamp;
      
      if (timeSpan < 60000) { // Within 1 minute
        this.emitThreat({
          type: 'suspicious_pattern',
          severity: 'high',
          description: `Rapid unauthorized access attempts from ${identifier}`,
          metadata: {
            identifier,
            attempts: unauthorizedEvents.length,
            timespan: timeSpan,
            resources: [...new Set(unauthorizedEvents.map(e => e.resource_type))]
          },
          timestamp: Date.now()
        });
      }
    }
  }

  private emitThreat(threat: ThreatDetection) {
    // Log the threat
    securityLogger.log({
      type: 'unauthorized_access',
      severity: 'critical',
      details: {
        threat_type: threat.type,
        threat_severity: threat.severity,
        threat_description: threat.description,
        threat_metadata: threat.metadata
      }
    });

    // Notify callbacks
    if (this.config.enableRealTimeAlerts) {
      this.alertCallbacks.forEach(callback => {
        try {
          callback(threat);
        } catch (error) {
          console.error('Security monitor callback error:', error);
        }
      });
    }
  }

  // Start monitoring
  startMonitoring() {
    if (!this.config.enableRealTimeAlerts) return;

    // Subscribe to security events from Supabase
    const subscription = supabase
      .channel('security_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_log'
        },
        (payload) => {
          this.analyzeEvent(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  // Get threat summary
  getThreatSummary(): {
    activeThreats: number;
    criticalThreats: number;
    recentActivity: number;
    topTargets: string[];
  } {
    const now = Date.now();
    const recentWindow = 3600000; // 1 hour
    let recentActivity = 0;
    const targetCounts: Record<string, number> = {};

    this.eventCache.forEach((events, identifier) => {
      const recentEvents = events.filter(e => now - e.timestamp < recentWindow);
      recentActivity += recentEvents.length;
      
      if (recentEvents.length > 0) {
        targetCounts[identifier] = recentEvents.length;
      }
    });

    const topTargets = Object.entries(targetCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([identifier]) => identifier);

    return {
      activeThreats: this.eventCache.size,
      criticalThreats: Array.from(this.eventCache.values())
        .filter(events => events.some(e => 
          e.action.includes('unauthorized') || 
          e.action.includes('xss_attempt')
        )).length,
      recentActivity,
      topTargets
    };
  }
}

export const useSecurityMonitor = (config?: Partial<SecurityMonitorConfig>) => {
  const [monitor] = useState(() => new SecurityMonitor(config));
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [summary, setSummary] = useState(monitor.getThreatSummary());

  useEffect(() => {
    // Set up threat detection callback
    monitor.onThreatDetected((threat) => {
      setThreats(prev => [threat, ...prev].slice(0, 50)); // Keep last 50 threats
      setSummary(monitor.getThreatSummary());
    });

    // Start monitoring
    const unsubscribe = monitor.startMonitoring();

    // Update summary periodically
    const interval = setInterval(() => {
      setSummary(monitor.getThreatSummary());
    }, 30000);

    return () => {
      unsubscribe?.();
      clearInterval(interval);
    };
  }, [monitor]);

  return {
    monitor,
    threats,
    summary,
    analyzeEvent: (event: any) => monitor.analyzeEvent(event)
  };
};

export { SecurityMonitor, type ThreatDetection, type SecurityMonitorConfig };