
import { supabase } from '@/integrations/supabase/client';

export interface UploadHistoryRecord {
  id: string;
  original_filename: string;
  stored_filename?: string;
  upload_type: string;
  uploaded_by?: string;
  upload_started_at: string;
  upload_completed_at?: string;
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  duplicate_imports: number;
  field_mapping: Record<string, any>;
  processing_errors: any[];
  upload_status: 'processing' | 'completed' | 'failed';
  created_at: string;
  user_id: string;
  error_details?: string;
  inventory_condition?: string;
  duplicate_count: number;
}

export const createUploadHistory = async (
  fileName: string,
  fileSize: number,
  fileType: string,
  fieldMapping: Record<string, any>
): Promise<string> => {
  const { data, error } = await supabase
    .from('upload_history')
    .insert({
      original_filename: fileName,
      stored_filename: fileName,
      upload_type: 'leads',
      file_size: fileSize,
      file_type: fileType,
      field_mapping: fieldMapping as any,
      total_rows: 0,
      successful_imports: 0,
      failed_imports: 0,
      duplicate_count: 0,
      processing_errors: [],
      upload_status: 'processing',
      user_id: (await supabase.auth.getUser()).data.user?.id || ''
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating upload history:', error);
    throw error;
  }

  return data.id;
};

export const updateUploadHistory = async (
  uploadId: string,
  updates: {
    total_rows?: number;
    successful_imports?: number;
    failed_imports?: number;
    duplicate_imports?: number;
    processing_errors?: any[];
    upload_status?: 'processing' | 'completed' | 'failed';
  }
): Promise<void> => {
  const updateData: any = { ...updates };
  
  // Map duplicate_imports to duplicate_count if needed
  if (updates.duplicate_imports !== undefined) {
    updateData.duplicate_count = updates.duplicate_imports;
    delete updateData.duplicate_imports;
  }
  
  // Add completion timestamp if status is completed
  if (updates.upload_status === 'completed') {
    updateData.upload_completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('upload_history')
    .update(updateData)
    .eq('id', uploadId);

  if (error) {
    console.error('Error updating upload history:', error);
    throw error;
  }
};

export const getUploadHistory = async (): Promise<UploadHistoryRecord[]> => {
  const { data, error } = await supabase
    .from('upload_history')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching upload history:', error);
    throw error;
  }

  // Transform the data to match our interface
  return (data || []).map(record => ({
    ...record,
    duplicate_imports: record.duplicate_count || 0,
    upload_started_at: record.created_at,
    field_mapping: (record.field_mapping as any) || {},
    processing_errors: (record.processing_errors as any) || []
  })) as UploadHistoryRecord[];
};
