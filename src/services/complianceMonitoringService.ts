
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
  ruleType: 'keyword_detection' | 'pattern_matching' | 'ai_analysis';
  description: string;
  detectionPattern?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  autoFlag: boolean;
  createdAt: string;
  updatedAt: string;
}

// Type guards for validation
const isValidSeverity = (severity: string): severity is 'low' | 'medium' | 'high' | 'critical' => {
  return ['low', 'medium', 'high', 'critical'].includes(severity);
};

const isValidStatus = (status: string): status is 'open' | 'resolved' | 'false_positive' => {
  return ['open', 'resolved', 'false_positive'].includes(status);
};

// Scan message for compliance violations
export const scanMessageForViolations = async (conversationId: string, messageBody: string, leadId: string): Promise<ComplianceViolation[]> => {
  try {
    console.log('Scanning message for compliance violations:', { conversationId, leadId });

    // Get active compliance rules
    const { data: rules, error: rulesError } = await supabase
      .from('compliance_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError || !rules) {
      console.error('Error fetching compliance rules:', rulesError);
      return [];
    }

    const violations: ComplianceViolation[] = [];

    for (const rule of rules) {
      let violationDetected = false;
      let detectedContent = '';

      if (rule.rule_type === 'keyword_detection' && rule.detection_pattern) {
        // Check for keyword/pattern matches
        const regex = new RegExp(rule.detection_pattern, 'gi');
        const matches = messageBody.match(regex);
        if (matches) {
          violationDetected = true;
          detectedContent = matches.join(', ');
        }
      } else if (rule.rule_type === 'ai_analysis') {
        // Use AI to analyze the message for violations
        const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
          body: {
            action: 'compliance_check',
            message: messageBody,
            ruleType: rule.rule_name
          }
        });

        if (!aiError && aiResponse?.violation) {
          violationDetected = true;
          detectedContent = aiResponse.detectedContent || messageBody.substring(0, 100);
        }
      }

      if (violationDetected) {
        const validatedSeverity = isValidSeverity(rule.severity) ? rule.severity : 'medium';
        
        const violationData = {
          conversation_id: conversationId,
          lead_id: leadId,
          violation_type: rule.rule_name,
          severity: validatedSeverity,
          description: rule.description,
          detected_content: detectedContent,
          confidence_score: 0.8, // Default confidence
          status: 'open' as const
        };

        const { data: violation, error: violationError } = await supabase
          .from('compliance_violations')
          .insert(violationData)
          .select()
          .single();

        if (!violationError && violation) {
          violations.push({
            id: violation.id,
            conversationId: violation.conversation_id,
            leadId: violation.lead_id,
            violationType: violation.violation_type,
            severity: validatedSeverity,
            description: violation.description,
            detectedContent: violation.detected_content,
            confidenceScore: violation.confidence_score,
            reviewed: violation.reviewed,
            reviewedBy: violation.reviewed_by,
            reviewedAt: violation.reviewed_at,
            status: isValidStatus(violation.status) ? violation.status : 'open',
            createdAt: violation.created_at
          });
        }
      }
    }

    return violations;
  } catch (error) {
    console.error('Error scanning message for violations:', error);
    return [];
  }
};

// Get compliance violations for a lead
export const getComplianceViolations = async (leadId: string): Promise<ComplianceViolation[]> => {
  try {
    const { data, error } = await supabase
      .from('compliance_violations')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      conversationId: item.conversation_id,
      leadId: item.lead_id,
      violationType: item.violation_type,
      severity: isValidSeverity(item.severity) ? item.severity : 'medium',
      description: item.description,
      detectedContent: item.detected_content,
      confidenceScore: item.confidence_score,
      reviewed: item.reviewed,
      reviewedBy: item.reviewed_by,
      reviewedAt: item.reviewed_at,
      status: isValidStatus(item.status) ? item.status : 'open',
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Error getting compliance violations:', error);
    return [];
  }
};

// Mark violation as reviewed
export const reviewComplianceViolation = async (violationId: string, status: 'resolved' | 'false_positive', reviewerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('compliance_violations')
      .update({
        status,
        reviewed: true,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', violationId);

    return !error;
  } catch (error) {
    console.error('Error reviewing compliance violation:', error);
    return false;
  }
};
