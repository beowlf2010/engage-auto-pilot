
import { supabase } from '@/integrations/supabase/client';

export interface ComplianceViolation {
  id: string;
  conversationId: string;
  leadId: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedContent: string;
  confidenceScore: number;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  status: 'open' | 'resolved' | 'false_positive';
  createdAt: string;
}

export interface ComplianceRule {
  id: string;
  ruleName: string;
  ruleType: string;
  description: string;
  detectionPattern?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  autoFlag: boolean;
}

// Monitor conversation for compliance violations
export const monitorConversationCompliance = async (
  conversationId: string,
  messageContent: string,
  leadId: string
): Promise<ComplianceViolation[]> => {
  try {
    console.log('Monitoring conversation for compliance:', conversationId);

    // Get active compliance rules
    const { data: rules, error: rulesError } = await supabase
      .from('compliance_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) throw rulesError;

    const violations: ComplianceViolation[] = [];

    // Check each rule against the message content
    for (const rule of rules || []) {
      const violation = await checkRuleViolation(rule, messageContent, conversationId, leadId);
      if (violation) {
        violations.push(violation);
      }
    }

    return violations;
  } catch (error) {
    console.error('Error monitoring compliance:', error);
    return [];
  }
};

// Check if a message violates a specific compliance rule
const checkRuleViolation = async (
  rule: any,
  messageContent: string,
  conversationId: string,
  leadId: string
): Promise<ComplianceViolation | null> => {
  try {
    let violationDetected = false;
    let confidenceScore = 0;

    // Basic pattern matching for common violations
    switch (rule.rule_type) {
      case 'prohibited_language':
        const prohibitedWords = ['guaranteed', 'promise', 'no risk', 'immediate'];
        violationDetected = prohibitedWords.some(word => 
          messageContent.toLowerCase().includes(word.toLowerCase())
        );
        confidenceScore = 0.8;
        break;

      case 'pricing_claims':
        const pricingPatterns = [/lowest price/i, /best deal/i, /unbeatable/i];
        violationDetected = pricingPatterns.some(pattern => pattern.test(messageContent));
        confidenceScore = 0.9;
        break;

      case 'time_restrictions':
        const currentHour = new Date().getHours();
        if (currentHour < 8 || currentHour > 19) {
          violationDetected = true;
          confidenceScore = 1.0;
        }
        break;

      case 'frequency_limits':
        // Check if too many messages sent recently
        const { data: recentMessages } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', leadId)
          .eq('direction', 'out')
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (recentMessages && recentMessages.length > 3) {
          violationDetected = true;
          confidenceScore = 0.95;
        }
        break;

      default:
        if (rule.detection_pattern) {
          const pattern = new RegExp(rule.detection_pattern, 'i');
          violationDetected = pattern.test(messageContent);
          confidenceScore = 0.7;
        }
    }

    if (violationDetected) {
      // Store violation in database
      const { data: violation, error } = await supabase
        .from('compliance_violations')
        .insert({
          conversation_id: conversationId,
          lead_id: leadId,
          violation_type: rule.rule_name,
          severity: rule.severity,
          description: rule.description,
          detected_content: messageContent.substring(0, 500),
          confidence_score: confidenceScore,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: violation.id,
        conversationId: violation.conversation_id,
        leadId: violation.lead_id,
        violationType: violation.violation_type,
        severity: violation.severity as 'low' | 'medium' | 'high' | 'critical',
        description: violation.description,
        detectedContent: violation.detected_content,
        confidenceScore: violation.confidence_score,
        reviewed: violation.reviewed,
        reviewedBy: violation.reviewed_by,
        reviewedAt: violation.reviewed_at,
        status: violation.status as 'open' | 'resolved' | 'false_positive',
        createdAt: violation.created_at
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking rule violation:', error);
    return null;
  }
};

// Get all compliance violations
export const getComplianceViolations = async (): Promise<ComplianceViolation[]> => {
  try {
    const { data, error } = await supabase
      .from('compliance_violations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(item => ({
      id: item.id,
      conversationId: item.conversation_id,
      leadId: item.lead_id,
      violationType: item.violation_type,
      severity: item.severity as 'low' | 'medium' | 'high' | 'critical',
      description: item.description,
      detectedContent: item.detected_content,
      confidenceScore: item.confidence_score,
      reviewed: item.reviewed,
      reviewedBy: item.reviewed_by,
      reviewedAt: item.reviewed_at,
      status: item.status as 'open' | 'resolved' | 'false_positive',
      createdAt: item.created_at
    })) || [];
  } catch (error) {
    console.error('Error fetching compliance violations:', error);
    return [];
  }
};

// Review a compliance violation
export const reviewComplianceViolation = async (
  violationId: string,
  status: 'resolved' | 'false_positive',
  reviewedBy: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('compliance_violations')
      .update({
        status,
        reviewed: true,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', violationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error reviewing compliance violation:', error);
    return false;
  }
};

// Get compliance settings
export const getComplianceSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('compliance_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || {
      message_window_start: '08:00:00',
      message_window_end: '19:00:00',
      sms_disclaimer: null,
      email_disclaimer: null,
      policy_links: []
    };
  } catch (error) {
    console.error('Error fetching compliance settings:', error);
    return null;
  }
};

// Update compliance settings
export const updateComplianceSettings = async (settings: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('compliance_settings')
      .upsert(settings);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating compliance settings:', error);
    return false;
  }
};
