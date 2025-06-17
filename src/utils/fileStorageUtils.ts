
import { supabase } from "@/integrations/supabase/client";

export interface UploadHistoryRecord {
  id: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  file_type: string;
  upload_type: string;
  inventory_condition?: string;
  user_id: string;
  created_at: string;
}

export const storeUploadedFile = async (
  file: File, 
  userId: string, 
  uploadType: 'inventory' | 'leads',
  inventoryCondition?: string
): Promise<UploadHistoryRecord> => {
  try {
    console.log('Attempting to store file:', file.name, 'Size:', file.size);
    
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storedFilename = `${userId}/${timestamp}-${file.name}`;
    
    console.log('Generated filename:', storedFilename);
    
    // Try to upload file to storage with more specific error handling
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storedFilename, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Storage upload error details:', uploadError);
      throw new Error(`File upload failed: ${uploadError.message}`);
    }
    
    console.log('File uploaded successfully:', uploadData);
    
    // Create upload history record
    const { data: historyRecord, error: historyError } = await supabase
      .from('upload_history')
      .insert({
        user_id: userId,
        original_filename: file.name,
        stored_filename: storedFilename,
        file_size: file.size,
        file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        upload_type: uploadType,
        inventory_condition: inventoryCondition,
        processing_status: 'processing'
      })
      .select()
      .single();
    
    if (historyError) {
      console.error('History record creation error:', historyError);
      throw new Error(`History record creation failed: ${historyError.message}`);
    }
    
    console.log('Upload history record created:', historyRecord);
    return historyRecord;
  } catch (error) {
    console.error('Error storing uploaded file:', error);
    throw error;
  }
};

// Fallback function that creates upload history without file storage
export const createUploadHistoryWithoutStorage = async (
  file: File, 
  userId: string, 
  uploadType: 'inventory' | 'leads',
  inventoryCondition?: string
): Promise<UploadHistoryRecord> => {
  try {
    console.log('Creating upload history without storage for:', file.name);
    
    // Create upload history record without storing the file
    const { data: historyRecord, error: historyError } = await supabase
      .from('upload_history')
      .insert({
        user_id: userId,
        original_filename: file.name,
        stored_filename: `fallback-${Date.now()}-${file.name}`, // Placeholder filename
        file_size: file.size,
        file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        upload_type: uploadType,
        inventory_condition: inventoryCondition,
        processing_status: 'processing'
      })
      .select()
      .single();
    
    if (historyError) {
      throw new Error(`History record creation failed: ${historyError.message}`);
    }
    
    console.log('Upload history record created (without storage):', historyRecord);
    return historyRecord;
  } catch (error) {
    console.error('Error creating upload history without storage:', error);
    throw error;
  }
};

export const updateUploadHistory = async (
  uploadId: string,
  updates: {
    total_rows?: number;
    successful_imports?: number;
    failed_imports?: number;
    processing_status?: string;
    error_details?: string;
  }
) => {
  try {
    const { error } = await supabase
      .from('upload_history')
      .update({
        ...updates,
        processed_at: new Date().toISOString()
      })
      .eq('id', uploadId);
    
    if (error) {
      throw new Error(`History update failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating upload history:', error);
    throw error;
  }
};
