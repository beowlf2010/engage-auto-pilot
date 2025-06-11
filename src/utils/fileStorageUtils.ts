
import { supabase } from '@/integrations/supabase/client';

export interface UploadHistoryRecord {
  id: string;
  user_id: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  file_type: string;
  upload_type: string;
  inventory_condition?: string;
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  duplicate_count: number;
  processing_status: string;
  error_details?: string;
  created_at: string;
  processed_at?: string;
}

export const storeUploadedFile = async (file: File, userId: string, uploadType: 'inventory' | 'leads', condition?: string) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storedFilename = `${userId}/${timestamp}_${condition || uploadType}_${file.name}`;
    
    console.log(`Storing file: ${storedFilename}`);
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storedFilename, file);

    if (uploadError) {
      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    // Create upload history record
    const uploadRecord = {
      user_id: userId,
      original_filename: file.name,
      stored_filename: storedFilename,
      file_size: file.size,
      file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
      upload_type: uploadType,
      inventory_condition: condition,
      total_rows: 0,
      successful_imports: 0,
      failed_imports: 0,
      duplicate_count: 0,
      processing_status: 'processing'
    };

    const { data: historyData, error: historyError } = await supabase
      .from('upload_history')
      .insert(uploadRecord)
      .select()
      .single();

    if (historyError) {
      throw new Error(`History record creation failed: ${historyError.message}`);
    }

    console.log('File stored successfully:', historyData);
    return historyData;
  } catch (error) {
    console.error('File storage error:', error);
    throw error;
  }
};

export const updateUploadHistory = async (
  uploadId: string, 
  updates: {
    total_rows?: number;
    successful_imports?: number;
    failed_imports?: number;
    duplicate_count?: number;
    processing_status?: string;
    error_details?: string;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('upload_history')
      .update({
        ...updates,
        processed_at: new Date().toISOString()
      })
      .eq('id', uploadId)
      .select()
      .single();

    if (error) {
      throw new Error(`Upload history update failed: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Upload history update error:', error);
    throw error;
  }
};

export const getUploadHistory = async (userId: string, uploadType?: string) => {
  try {
    let query = supabase
      .from('upload_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (uploadType) {
      query = query.eq('upload_type', uploadType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch upload history: ${error.message}`);
    }

    return data as UploadHistoryRecord[];
  } catch (error) {
    console.error('Upload history fetch error:', error);
    throw error;
  }
};

export const downloadStoredFile = async (storedFilename: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('uploads')
      .download(storedFilename);

    if (error) {
      throw new Error(`File download failed: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('File download error:', error);
    throw error;
  }
};

export const deleteStoredFile = async (storedFilename: string, uploadId: string) => {
  try {
    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('uploads')
      .remove([storedFilename]);

    if (storageError) {
      throw new Error(`File deletion failed: ${storageError.message}`);
    }

    // Delete upload history record
    const { error: historyError } = await supabase
      .from('upload_history')
      .delete()
      .eq('id', uploadId);

    if (historyError) {
      throw new Error(`History record deletion failed: ${historyError.message}`);
    }

    console.log('File and history record deleted successfully');
  } catch (error) {
    console.error('File deletion error:', error);
    throw error;
  }
};
