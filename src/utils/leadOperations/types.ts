
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';

export interface LeadInsertResult {
  success: boolean;
  leadId?: string;
  error?: string;
}

export interface BulkInsertResult {
  totalProcessed: number;
  successfulInserts: number;
  errors: Array<{
    leadData: ProcessedLead;
    error: string;
    rowIndex: number;
  }>;
  duplicates: Array<{
    leadData: ProcessedLead;
    duplicateType: 'phone' | 'email' | 'name';
    rowIndex: number;
  }>;
}
