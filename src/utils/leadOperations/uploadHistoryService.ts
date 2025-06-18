
import { supabase } from '@/integrations/supabase/client';

export interface UploadHistoryRecord {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
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
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      field_mapping: fieldMapping,
      total_rows: 0,
      successful_imports: 0,
      failed_imports: 0,
      duplicate_imports: 0,
      processing_errors: [],
      upload_status: 'processing'
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
  updates: Partial<UploadHistoryRecord>
): Promise<void> => {
  const { error } = await supabase
    .from('upload_history')
    .update({
      ...updates,
      upload_completed_at: updates.upload_status === 'completed' ? new Date().toISOString() : undefined
    })
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
    .order('upload_started_at', { ascending: false });

  if (error) {
    console.error('Error fetching upload history:', error);
    throw error;
  }

  return data || [];
};
