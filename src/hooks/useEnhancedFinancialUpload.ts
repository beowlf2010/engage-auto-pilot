
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseFinancialFile } from "@/utils/financialFileParser";
import { insertFinancialData } from "@/utils/financialDataOperations";
import { supabase } from "@/integrations/supabase/client";

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  dealsProcessed?: number;
}

interface BatchResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalDeals: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    dealsProcessed?: number;
    error?: string;
  }>;
}

export const useEnhancedFinancialUpload = (userId: string) => {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const { toast } = useToast();

  const addFiles = (newFiles: QueuedFile[]) => {
    setQueuedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setQueuedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateFileStatus = (fileId: string, updates: Partial<QueuedFile>) => {
    setQueuedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ...updates } : f
    ));
  };

  const processFile = async (queuedFile: QueuedFile): Promise<void> => {
    updateFileStatus(queuedFile.id, { status: 'processing' });

    try {
      console.log('Processing financial file:', queuedFile.file.name);
      
      // Parse the financial file
      const { deals, summary, fileName } = await parseFinancialFile(queuedFile.file);

      if (deals.length === 0) {
        throw new Error('No valid deals found in the file. Please check that you uploaded a DMS Sales Analysis Detail report with the correct format.');
      }

      // Create upload history record
      const { data: uploadHistory, error: uploadError } = await supabase
        .from('upload_history')
        .insert({
          original_filename: fileName,
          stored_filename: fileName,
          file_type: queuedFile.file.name.toLowerCase().substring(queuedFile.file.name.lastIndexOf('.') + 1),
          file_size: queuedFile.file.size,
          upload_type: 'financial',
          total_rows: deals.length,
          user_id: userId,
          processing_status: 'processing'
        })
        .select()
        .single();

      if (uploadError) {
        throw uploadError;
      }

      // Insert financial data
      const uploadDate = new Date().toISOString().split('T')[0];
      const result = await insertFinancialData(deals, summary, uploadHistory.id, uploadDate);

      // Update upload history
      await supabase
        .from('upload_history')
        .update({
          processing_status: 'completed',
          successful_imports: result.insertedDeals,
          processed_at: new Date().toISOString()
        })
        .eq('id', uploadHistory.id);

      updateFileStatus(queuedFile.id, { 
        status: 'success',
        dealsProcessed: result.insertedDeals
      });

    } catch (error) {
      console.error('Financial file processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      
      updateFileStatus(queuedFile.id, { 
        status: 'error',
        error: errorMessage
      });
      
      throw error;
    }
  };

  const processBatch = async () => {
    const pendingFiles = queuedFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setBatchResult(null);

    const results: BatchResult['results'] = [];
    let totalDeals = 0;
    let successfulFiles = 0;
    let failedFiles = 0;

    try {
      // Process files sequentially
      for (const file of pendingFiles) {
        try {
          await processFile(file);
          
          const updatedFile = queuedFiles.find(f => f.id === file.id);
          const dealsProcessed = updatedFile?.dealsProcessed || 0;
          
          totalDeals += dealsProcessed;
          successfulFiles++;
          
          results.push({
            fileName: file.file.name,
            status: 'success',
            dealsProcessed
          });
        } catch (error) {
          failedFiles++;
          results.push({
            fileName: file.file.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Processing failed'
          });
        }
      }

      const batchResult: BatchResult = {
        totalFiles: pendingFiles.length,
        successfulFiles,
        failedFiles,
        totalDeals,
        results
      };

      setBatchResult(batchResult);

      if (failedFiles === 0) {
        toast({
          title: "Batch upload successful!",
          description: `${successfulFiles} files processed, ${totalDeals} deals imported`,
        });
      } else {
        toast({
          title: "Batch upload completed with errors",
          description: `${successfulFiles} files succeeded, ${failedFiles} files failed`,
          variant: "default"
        });
      }

    } finally {
      setUploading(false);
    }
  };

  const clearResults = () => {
    setBatchResult(null);
    setQueuedFiles([]);
  };

  const resetState = () => {
    setQueuedFiles([]);
    setUploading(false);
    setBatchResult(null);
  };

  return {
    queuedFiles,
    uploading,
    batchResult,
    addFiles,
    removeFile,
    processBatch,
    clearResults,
    resetState
  };
};
