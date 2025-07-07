/**
 * Comprehensive outbound message monitoring service to prevent generic names
 * from being sent to customers and ensure quality message delivery
 */

import { validatePersonalName } from './nameValidationService';
import { formatProperName } from '@/utils/nameFormatter';

export interface MessageValidationResult {
  isValid: boolean;
  hasGenericName: boolean;
  originalName?: string;
  suggestedGreeting?: string;
  blockedReasons: string[];
  replacements: Array<{
    original: string;
    replacement: string;
    reason: string;
  }>;
}

export interface MessageMonitoringAlert {
  id: string;
  timestamp: Date;
  leadId: string;
  originalMessage: string;
  processedMessage: string;
  nameIssuesDetected: string[];
  action: 'blocked' | 'modified' | 'approved';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Patterns that indicate generic names in messages
const GENERIC_NAME_PATTERNS = [
  /\b(hi|hello|dear)\s+(not\s+provided|unknown|n\/a|na|null|undefined|none|customer|lead|prospect|caller|visitor|user|guest|anonymous|not\s+specified|no\s+name|firstname|lastname|enter\s+name|your\s+name|full\s+name)\b/gi,
  /\b(hi|hello|dear)\s+([a-z]+\s+){2,}/gi, // Multiple words that might be business names
  /\b(hi|hello|dear)\s+\d+/gi, // Names starting with numbers
  /\b(hi|hello|dear)\s+[^a-z\s\-\'\.]/gi, // Names with special characters
];

// City/state patterns in greetings
const GEOGRAPHIC_NAME_PATTERNS = [
  /\b(hi|hello|dear)\s+(pensacola|mobile|birmingham|huntsville|montgomery|atlanta|savannah|jacksonville|miami|tampa|orlando|new\s+york|los\s+angeles|chicago|houston|phoenix|philadelphia)\b/gi,
  /\b(hi|hello|dear)\s+(alabama|florida|georgia|texas|california|new\s+york)\b/gi,
];

// Business name patterns in greetings
const BUSINESS_NAME_PATTERNS = [
  /\b(hi|hello|dear)\s+\w*\s*(llc|inc|corp|corporation|company|co|ltd|limited|group|enterprises|solutions|services|systems|technologies|automotive|motors|dealership|dealer|sales|auto)\b/gi,
];

class OutboundMessageMonitor {
  private alerts: MessageMonitoringAlert[] = [];
  private emergencyStop = false;
  private suspiciousPatternCount = 0;
  private readonly maxSuspiciousPatterns = 5; // Emergency stop threshold

  /**
   * Pre-send validation for all outbound messages
   */
  async validateOutboundMessage(
    messageContent: string,
    leadData: {
      id: string;
      first_name?: string;
      last_name?: string;
      vehicle_interest?: string;
    }
  ): Promise<MessageValidationResult> {
    console.log(`🔍 [MESSAGE MONITOR] Validating outbound message for lead ${leadData.id}`);

    // Check emergency stop
    if (this.emergencyStop) {
      console.error(`🚫 [MESSAGE MONITOR] Emergency stop active - blocking all messages`);
      return {
        isValid: false,
        hasGenericName: true,
        blockedReasons: ['Emergency stop activated due to multiple generic name detections'],
        replacements: []
      };
    }

    const validation: MessageValidationResult = {
      isValid: true,
      hasGenericName: false,
      blockedReasons: [],
      replacements: []
    };

    // 1. Check for generic name patterns in message content
    const genericDetection = this.detectGenericNamesInContent(messageContent);
    if (genericDetection.found) {
      validation.hasGenericName = true;
      validation.blockedReasons.push(...genericDetection.reasons);
      
      // Suggest replacement with generic greeting
      const contextualGreeting = await this.generateContextualGreeting(leadData);
      validation.suggestedGreeting = contextualGreeting;
      
      // Try to auto-fix the message
      const fixedMessage = this.autoFixGenericNameMessage(messageContent, contextualGreeting);
      if (fixedMessage !== messageContent) {
        validation.replacements.push({
          original: messageContent,
          replacement: fixedMessage,
          reason: 'Replaced generic name greeting with contextual greeting'
        });
      }
    }

    // 2. Validate the lead's name independently
    if (leadData.first_name) {
      const nameValidation = await validatePersonalName(leadData.first_name);
      if (!nameValidation.isValidPersonalName && nameValidation.confidence < 0.5) {
        validation.originalName = leadData.first_name;
        
        // If message uses the invalid name, suggest generic greeting
        const nameInMessage = new RegExp(`\\b(hi|hello|dear)\\s+${leadData.first_name}\\b`, 'gi');
        if (nameInMessage.test(messageContent)) {
          validation.hasGenericName = true;
          validation.blockedReasons.push(`Invalid personal name detected: \"${leadData.first_name}\" (type: ${nameValidation.detectedType})`);
          
          const contextualGreeting = await this.generateContextualGreeting(leadData);
          validation.suggestedGreeting = contextualGreeting;
        }
      }
    }

    // 3. Final validation decision
    if (validation.hasGenericName && validation.blockedReasons.length > 0) {
      validation.isValid = false;
      this.suspiciousPatternCount++;
      
      // Create monitoring alert
      this.createAlert({
        leadId: leadData.id,
        originalMessage: messageContent,
        processedMessage: validation.replacements[0]?.replacement || messageContent,
        nameIssuesDetected: validation.blockedReasons,
        action: validation.replacements.length > 0 ? 'modified' : 'blocked',
        severity: this.determineSeverity(validation.blockedReasons)
      });

      // Check if we should trigger emergency stop
      if (this.suspiciousPatternCount >= this.maxSuspiciousPatterns) {
        this.triggerEmergencyStop();
      }
    }

    console.log(`${validation.isValid ? '✅' : '❌'} [MESSAGE MONITOR] Validation result:`, {
      isValid: validation.isValid,
      hasGenericName: validation.hasGenericName,
      blockedReasons: validation.blockedReasons.length,
      replacements: validation.replacements.length
    });

    return validation;
  }

  /**
   * Process and potentially fix message before sending
   */
  async processOutboundMessage(
    messageContent: string,
    leadData: {
      id: string;
      first_name?: string;
      last_name?: string;
      vehicle_interest?: string;
    }
  ): Promise<{ processedMessage: string; modifications: string[] }> {
    const validation = await this.validateOutboundMessage(messageContent, leadData);
    
    if (!validation.isValid && validation.replacements.length > 0) {
      // Use the auto-fixed message
      const processedMessage = validation.replacements[0].replacement;
      const modifications = validation.replacements.map(r => r.reason);
      
      console.log(`🔧 [MESSAGE MONITOR] Auto-fixed message for lead ${leadData.id}`);
      console.log(`📝 [MESSAGE MONITOR] Original: \"${messageContent}\"`);
      console.log(`📝 [MESSAGE MONITOR] Fixed: \"${processedMessage}\"`);
      
      return { processedMessage, modifications };
    }
    
    if (!validation.isValid) {
      // Block the message entirely
      console.error(`🚫 [MESSAGE MONITOR] Blocking message for lead ${leadData.id}: ${validation.blockedReasons.join(', ')}`);
      throw new Error(`Message blocked: ${validation.blockedReasons.join(', ')}`);
    }
    
    return { processedMessage: messageContent, modifications: [] };
  }

  /**
   * Detect generic names in message content
   */
  private detectGenericNamesInContent(content: string): { found: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check each pattern type
    GENERIC_NAME_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        reasons.push(`Generic name pattern detected: \"${matches[0]}\" (Pattern ${index + 1})`);
      }
    });

    GEOGRAPHIC_NAME_PATTERNS.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        reasons.push(`Geographic location used as name: \"${matches[0]}\"`);
      }
    });

    BUSINESS_NAME_PATTERNS.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        reasons.push(`Business name used as personal name: \"${matches[0]}\"`);
      }
    });

    return {
      found: reasons.length > 0,
      reasons
    };
  }

  /**
   * Auto-fix messages with generic names
   */
  private autoFixGenericNameMessage(originalMessage: string, contextualGreeting: string): string {
    let fixedMessage = originalMessage;

    // Replace problematic greeting patterns with contextual greeting
    GENERIC_NAME_PATTERNS.forEach((pattern) => {
      fixedMessage = fixedMessage.replace(pattern, contextualGreeting);
    });

    GEOGRAPHIC_NAME_PATTERNS.forEach((pattern) => {
      fixedMessage = fixedMessage.replace(pattern, contextualGreeting);
    });

    BUSINESS_NAME_PATTERNS.forEach((pattern) => {
      fixedMessage = fixedMessage.replace(pattern, contextualGreeting);
    });

    return fixedMessage;
  }

  /**
   * Generate contextual greeting based on lead data
   */
  private async generateContextualGreeting(leadData: {
    first_name?: string;
    vehicle_interest?: string;
  }): Promise<string> {
    const vehicleInterest = leadData.vehicle_interest;
    const hasSpecificVehicle = vehicleInterest && 
      vehicleInterest !== 'finding the right vehicle for your needs' &&
      vehicleInterest !== 'Not specified' &&
      vehicleInterest.length > 10;

    if (hasSpecificVehicle) {
      return `Hello! Thanks for your interest in the ${vehicleInterest}.`;
    }

    return 'Hello! Thanks for your interest in finding the right vehicle.';
  }

  /**
   * Create monitoring alert
   */
  private createAlert(alertData: Omit<MessageMonitoringAlert, 'id' | 'timestamp'>): void {
    const alert: MessageMonitoringAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...alertData
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.warn(`⚠️ [MESSAGE MONITOR] Alert created:`, alert);
  }

  /**
   * Determine severity level
   */
  private determineSeverity(reasons: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (reasons.some(r => r.includes('Generic name pattern'))) {
      return 'critical';
    }
    if (reasons.some(r => r.includes('Business name'))) {
      return 'high';
    }
    if (reasons.some(r => r.includes('Geographic location'))) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Trigger emergency stop
   */
  private triggerEmergencyStop(): void {
    this.emergencyStop = true;
    console.error(`🚨 [MESSAGE MONITOR] EMERGENCY STOP TRIGGERED! Too many generic name patterns detected.`);
    
    // Create critical alert
    this.createAlert({
      leadId: 'system',
      originalMessage: 'System alert',
      processedMessage: 'Emergency stop activated',
      nameIssuesDetected: [`Emergency stop triggered after ${this.suspiciousPatternCount} suspicious patterns`],
      action: 'blocked',
      severity: 'critical'
    });
  }

  /**
   * Reset emergency stop (admin action)
   */
  resetEmergencyStop(): void {
    this.emergencyStop = false;
    this.suspiciousPatternCount = 0;
    console.log(`✅ [MESSAGE MONITOR] Emergency stop reset by admin`);
  }

  /**
   * Get current monitoring stats
   */
  getMonitoringStats() {
    const recentAlerts = this.alerts.filter(a => 
      a.timestamp.getTime() > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
    );

    return {
      emergencyStopActive: this.emergencyStop,
      suspiciousPatternCount: this.suspiciousPatternCount,
      totalAlerts: this.alerts.length,
      recentAlerts: recentAlerts.length,
      severityBreakdown: {
        critical: recentAlerts.filter(a => a.severity === 'critical').length,
        high: recentAlerts.filter(a => a.severity === 'high').length,
        medium: recentAlerts.filter(a => a.severity === 'medium').length,
        low: recentAlerts.filter(a => a.severity === 'low').length,
      }
    };
  }

  /**
   * Get recent alerts for monitoring dashboard
   */
  getRecentAlerts(limit = 20): MessageMonitoringAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

// Export singleton instance
export const outboundMessageMonitor = new OutboundMessageMonitor();

// Export utility functions
export const validateOutboundMessage = (content: string, leadData: any) => 
  outboundMessageMonitor.validateOutboundMessage(content, leadData);

export const processOutboundMessage = (content: string, leadData: any) => 
  outboundMessageMonitor.processOutboundMessage(content, leadData);

export const getMessageMonitoringStats = () => 
  outboundMessageMonitor.getMonitoringStats();

export const getRecentMessageAlerts = (limit?: number) => 
  outboundMessageMonitor.getRecentAlerts(limit);

export const resetMessageEmergencyStop = () => 
  outboundMessageMonitor.resetEmergencyStop();
