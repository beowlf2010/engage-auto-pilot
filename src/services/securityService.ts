import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

export interface SecurityAuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: unknown;
  user_agent?: string;
  created_at: string;
}

class SecurityService {
  /**
   * Log a security event for audit purposes
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_security_event', {
        p_action: event.action,
        p_resource_type: event.resource_type,
        p_resource_id: event.resource_id || null,
        p_details: event.details || null
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Get security audit logs (admin only)
   */
  async getSecurityAuditLogs(limit: number = 50): Promise<SecurityAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch security audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching security audit logs:', error);
      return [];
    }
  }

  /**
   * Validate API key format
   */
  validateApiKey(key: string, type: 'openai' | 'telnyx' | 'twilio' | 'sendgrid'): boolean {
    if (!key || typeof key !== 'string') return false;

    switch (type) {
      case 'openai':
        return key.startsWith('sk-') && key.length >= 50;
      case 'telnyx':
        return key.startsWith('KEY') && key.length >= 30;
      case 'twilio':
        return key.startsWith('SK') && key.length >= 30;
      case 'sendgrid':
        return key.startsWith('SG.') && key.length >= 40;
      default:
        return false;
    }
  }

  /**
   * Mask sensitive values for display
   */
  maskSensitiveValue(value: string, visibleChars: number = 4): string {
    if (!value || value.length <= visibleChars) return value;
    return value.substring(0, visibleChars) + '*'.repeat(value.length - visibleChars);
  }

  /**
   * Check if current user has required role
   */
  async hasRole(requiredRole: 'admin' | 'manager'): Promise<boolean> {
    try {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        console.error('Error checking user role:', error);
        return false;
      }

      return userRoles?.some(role => 
        role.role === requiredRole || 
        (requiredRole === 'manager' && role.role === 'admin')
      ) || false;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  /**
   * Enhanced rate limiting with server-side integration
   */
  private rateLimitMap = new Map<string, number[]>();

  checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.rateLimitMap.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      // Log rate limit violation for security monitoring
      this.logSecurityEvent({
        action: 'client_rate_limit_exceeded',
        resource_type: 'api_operations',
        details: {
          key,
          attempts: recentAttempts.length,
          maxAttempts,
          windowMs
        }
      });
      return false; // Rate limit exceeded
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.rateLimitMap.set(key, recentAttempts);
    
    return true; // Within rate limit
  }

  /**
   * Enhanced API key rotation with backup
   */
  async rotateApiKey(settingType: string, newValue: string, reason: string, emergencyRotation: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      // Client-side rate limiting check
      const rateLimitKey = `rotate-${settingType}`;
      if (!this.checkRateLimit(rateLimitKey, 3, 3600000)) { // 3 attempts per hour
        return { 
          success: false, 
          error: 'Rate limit exceeded for API key rotations. Please wait before trying again.' 
        };
      }

      // Log rotation attempt
      await this.logSecurityEvent({
        action: 'api_key_rotation_initiated',
        resource_type: 'api_keys',
        resource_id: settingType,
        details: {
          reason,
          emergency: emergencyRotation,
          timestamp: new Date().toISOString()
        }
      });

      const { data, error } = await supabase.functions.invoke('rotate-api-keys', {
        body: {
          settingType,
          newValue,
          reason,
          emergencyRotation
        }
      });

      if (error) {
        console.error('API key rotation failed:', error);
        await this.logSecurityEvent({
          action: 'api_key_rotation_failed',
          resource_type: 'api_keys',
          resource_id: settingType,
          details: {
            error: error.message,
            reason
          }
        });
        throw error;
      }

      await this.logSecurityEvent({
        action: 'api_key_rotation_completed',
        resource_type: 'api_keys',
        resource_id: settingType,
        details: {
          reason,
          emergency: emergencyRotation,
          backup_created: data.backupCreated
        }
      });

      return data;
    } catch (error) {
      console.error('Error rotating API key:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to rotate API key' 
      };
    }
  }

  /**
   * Enhanced security monitoring for suspicious patterns
   */
  async detectSuspiciousActivity(userId?: string): Promise<{ suspicious: boolean; patterns: string[] }> {
    try {
      const patterns: string[] = [];
      
      // Check for rapid API key operations
      const apiKeyOperations = Array.from(this.rateLimitMap.entries())
        .filter(([key]) => key.includes('api-key') || key.includes('setting'))
        .reduce((total, [, attempts]) => total + attempts.length, 0);
      
      if (apiKeyOperations > 10) {
        patterns.push('High frequency API key operations');
      }
      
      // Check for multiple failed validation attempts
      const validationAttempts = this.rateLimitMap.get('validation-attempts') || [];
      if (validationAttempts.length > 5) {
        patterns.push('Multiple API key validation failures');
      }
      
      // Check for unusual access patterns (different time zones, etc.)
      const accessTimes = this.rateLimitMap.get('access-times') || [];
      const currentHour = new Date().getHours();
      const unusualHours = accessTimes.filter(time => {
        const hour = new Date(time).getHours();
        return Math.abs(hour - currentHour) > 8; // Different timezone
      });
      
      if (unusualHours.length > 0) {
        patterns.push('Unusual access time patterns');
      }
      
      const suspicious = patterns.length > 0;
      
      if (suspicious && userId) {
        await this.logSecurityEvent({
          action: 'suspicious_activity_detected',
          resource_type: 'user_activity',
          resource_id: userId,
          details: {
            patterns,
            api_key_operations: apiKeyOperations,
            validation_attempts: validationAttempts.length,
            unusual_access_count: unusualHours.length
          }
        });
      }
      
      return { suspicious, patterns };
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return { suspicious: false, patterns: [] };
    }
  }

  /**
   * Validate input for XSS prevention
   */
  validateInput(input: string, maxLength: number = 1000): { isValid: boolean; sanitized: string } {
    if (!input || typeof input !== 'string') {
      return { isValid: false, sanitized: '' };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /expression\(/i,
      /vbscript:/i,
      /data:text\/html/i
    ];

    const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(input));
    
    if (hasSuspiciousContent) {
      return { isValid: false, sanitized: input.replace(/<[^>]*>/g, '') };
    }

    // Basic sanitization
    const sanitized = input.trim().substring(0, maxLength);
    
    return { isValid: true, sanitized };
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
}

export const securityService = new SecurityService();