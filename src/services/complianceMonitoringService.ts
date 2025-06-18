
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
    throw error;
  }
};

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

export const createComplianceViolation = async (
  violation: Omit<ComplianceViolation, 'id' | 'reviewed' | 'reviewedBy' | 'reviewedAt' | 'createdAt'>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('compliance_violations')
      .insert({
        conversation_id: violation.conversationId,
        lead_id: violation.leadId,
        violation_type: violation.violationType,
        severity: violation.severity,
        description: violation.description,
        detected_content: violation.detectedContent,
        confidence_score: violation.confidenceScore,
        status: violation.status
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating compliance violation:', error);
    return false;
  }
};
